#!/usr/bin/env python3
"""
Deploy a cPanel package (dist/sofa-app-*.zip) over FTPS, without File Manager.

What it does:
  1. Uploads the zip's contents (not the zip) into a staging folder `<app>.new`.
     The live app keeps running meanwhile.
  2. Copies `.htaccess` from the live app folder into the staging folder, if one exists.
  3. Swaps folders: `<app>` -> `<app>.old-<time>`, `<app>.new` -> `<app>`.
  4. Restarts the app by writing `<app>/tmp/restart.txt` (Passenger restart).
  5. Checks the site serves the new build, then deletes older backups
     (keeps the newest `--keep-backups`, default 1, for rollback).

The database, photos (UPLOAD_DIR) and the env vars set in cPanel are not touched.

Usage:
  python3 scripts/deploy_ftp.py                      # newest dist/*.zip
  python3 scripts/deploy_ftp.py dist/sofa-app-XXXX.zip
  python3 scripts/deploy_ftp.py --rollback           # switch back to the newest backup

Settings (env vars or flags):
  FTP_HOST      default a001.dapurhosting.com (the name on the server's TLS certificate)
  FTP_USER      default avaraco2
  FTP_PASSWORD  else read from ~/.config/avara-deploy/ftp-password (chmod 600;
                FTP_PASSWORD_FILE to change), else asked on the terminal
  FTP_APP_DIR   default sofa-app (relative to the FTP login folder = /home/<user>)
  SITE_URL      default https://sofa.avara.co.id

Standard library only (Python 3.8+).
"""

from __future__ import annotations

import argparse
import getpass
import glob
import io
import os
import posixpath
import queue
import ssl
import sys
import threading
import time
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from ftplib import FTP, FTP_TLS, error_perm

PRESERVE = [".htaccess"]  # copied from the live app folder into the new one, if present


def log(msg: str) -> None:
    print(msg, flush=True)


# --------------------------------------------------------------------------- FTP


class Conn:
    """Opens FTP(S) connections with the same settings."""

    def __init__(self, host: str, port: int, user: str, password: str, plain: bool, insecure: bool, timeout: int = 60):
        self.host, self.port, self.user, self.password = host, port, user, password
        self.plain, self.insecure, self.timeout = plain, insecure, timeout

    def open(self) -> FTP:
        if self.plain:
            ftp = FTP(timeout=self.timeout)
            ftp.connect(self.host, self.port)
            ftp.login(self.user, self.password)
        else:
            ctx = ssl.create_default_context()
            if self.insecure:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
            ftp = FTP_TLS(timeout=self.timeout, context=ctx)
            ftp.connect(self.host, self.port)
            ftp.login(self.user, self.password)
            ftp.prot_p()  # encrypt file transfers too
        ftp.voidcmd("TYPE I")
        return ftp


class Pool:
    """A small pool of FTP connections used from worker threads."""

    def __init__(self, conn: Conn, size: int):
        self.conn, self.size = conn, size
        self._free: "queue.Queue[FTP]" = queue.Queue()
        self._lock = threading.Lock()
        self._opened = 0

    def get(self) -> FTP:
        try:
            return self._free.get_nowait()
        except queue.Empty:
            pass
        with self._lock:
            if self._opened < self.size:
                self._opened += 1
                return self.conn.open()
        return self._free.get()

    def put(self, ftp: FTP) -> None:
        self._free.put(ftp)

    def run(self, fn, items, label: str = "") -> None:
        """Run fn(ftp, item) for every item in parallel; retries once on a fresh connection."""
        items = list(items)
        if not items:
            return
        done = 0
        t0 = time.time()

        def task(item):
            for attempt in range(3):
                ftp = self.get()
                try:
                    fn(ftp, item)
                    self.put(ftp)
                    return
                except error_perm:
                    self.put(ftp)
                    raise
                except Exception:
                    try:
                        ftp.close()
                    except Exception:
                        pass
                    with self._lock:
                        self._opened -= 1
                    if attempt == 2:
                        raise
                    time.sleep(1 + attempt)

        with ThreadPoolExecutor(max_workers=self.size) as ex:
            futures = [ex.submit(task, it) for it in items]
            for f in as_completed(futures):
                f.result()
                done += 1
                if label and (done % 100 == 0 or done == len(items)):
                    log(f"   {label}: {done}/{len(items)} ({time.time() - t0:.0f}s)")

    def close(self) -> None:
        while not self._free.empty():
            try:
                self._free.get_nowait().quit()
            except Exception:
                pass


def exists(ftp: FTP, path: str) -> bool:
    parent, name = posixpath.split(path.rstrip("/"))
    try:
        return name in [posixpath.basename(n) for n in ftp.nlst(parent or ".")]
    except error_perm:
        return False


def is_dir(ftp: FTP, path: str) -> bool:
    cwd = ftp.pwd()
    try:
        ftp.cwd(path)
        return True
    except error_perm:
        return False
    finally:
        ftp.cwd(cwd)


def listdir(ftp: FTP, path: str):
    """[(name, is_dir)] for a folder, skipping . and .. (needs MLSD, which Pure-FTPd supports)."""
    out = []
    for name, facts in ftp.mlsd(path, facts=["type"]):
        t = facts.get("type", "")
        if name in (".", "..") or t in ("cdir", "pdir"):
            continue
        out.append((name, t == "dir"))
    return out


def remove_tree(pool: Pool, root: str) -> None:
    """Delete a folder and everything in it, using parallel connections."""
    dirs_by_level = [[root]]
    files: list[str] = []
    level = [root]
    while level:
        found: list[list] = [[] for _ in level]

        def scan(ftp, idx):
            found[idx] = listdir(ftp, level[idx])

        pool.run(scan, range(len(level)))
        nxt = []
        for parent, entries in zip(level, found):
            for name, isdir in entries:
                p = f"{parent}/{name}"
                (nxt if isdir else files).append(p)
        if nxt:
            dirs_by_level.append(nxt)
        level = nxt

    pool.run(lambda ftp, p: ftp.delete(p), files, f"delete {root}")
    for dirs in reversed(dirs_by_level):
        pool.run(lambda ftp, p: ftp.rmd(p), dirs)


# --------------------------------------------------------------------------- steps


def read_zip(path: str):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    bad = [n for n in names if n.startswith("/") or ".." in n.split("/")]
    if bad:
        sys.exit(f"Unsafe paths in zip: {bad[:3]}")
    if any(posixpath.basename(n.rstrip("/")).startswith(".env") for n in names):
        sys.exit("The zip contains a .env file; refusing to deploy secrets.")
    for required in ("server.js", "package.json", ".next/BUILD_ID"):
        if required not in names:
            sys.exit(f"{path} has no {required}; is it a package from `npm run package:cpanel`?")
    files = [i for i in z.infolist() if not i.is_dir()]
    dirs = set()
    for i in files:
        d = posixpath.dirname(i.filename)
        while d:
            dirs.add(d)
            d = posixpath.dirname(d)
    build_id = z.read(".next/BUILD_ID").decode().strip()
    return z, files, sorted(dirs), build_id


def upload(pool: Pool, zpath: str, files, dirs, staging: str) -> None:
    # Folders, parents first: one depth level at a time, in parallel within a level.
    by_depth: dict[int, list[str]] = {}
    for d in dirs:
        by_depth.setdefault(d.count("/"), []).append(d)
    for depth in sorted(by_depth):
        pool.run(lambda ftp, d: ftp.mkd(f"{staging}/{d}"), by_depth[depth])
    log(f"   created {len(dirs)} folders")

    local = threading.local()

    def put(ftp, info):
        if not hasattr(local, "zip"):  # ZipFile isn't safe to share across threads
            local.zip = zipfile.ZipFile(zpath)
        data = local.zip.read(info.filename)
        target = f"{staging}/{info.filename}"
        ftp.storbinary(f"STOR {target}", io.BytesIO(data))
        size = ftp.size(target)
        if size != len(data):
            raise RuntimeError(f"size mismatch for {target}: {size} != {len(data)}")

    # Big files first so the slow ones don't end up last.
    pool.run(put, sorted(files, key=lambda i: -i.file_size), "upload")


def copy_preserved(ftp: FTP, app: str, staging: str) -> None:
    for name in PRESERVE:
        src = f"{app}/{name}"
        if not exists(ftp, src):
            continue
        buf = io.BytesIO()
        ftp.retrbinary(f"RETR {src}", buf.write)
        buf.seek(0)
        ftp.storbinary(f"STOR {staging}/{name}", buf)
        log(f"   kept {name}")


def restart(ftp: FTP, app: str) -> None:
    if not exists(ftp, f"{app}/tmp"):
        ftp.mkd(f"{app}/tmp")
    stamp = time.strftime("%Y-%m-%d %H:%M:%S").encode()
    ftp.storbinary(f"STOR {app}/tmp/restart.txt", io.BytesIO(stamp))


def check_site(url: str, build_id: str, wait: int) -> bool:
    """True once the login page is served by the new build and its JS chunk loads."""
    deadline = time.time() + wait
    last = ""
    while time.time() < deadline:
        try:
            req = urllib.request.Request(f"{url}/login", headers={"User-Agent": "avara-deploy", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=30) as r:
                html = r.read().decode("utf-8", "replace")
            if build_id in html:
                start = html.find("/_next/static/")
                if start >= 0:
                    chunk = html[start : html.find('"', start)]
                    with urllib.request.urlopen(url + chunk, timeout=30) as r:
                        r.read()
                return True
            last = "old build still served"
        except Exception as e:  # noqa: BLE001
            last = str(e)
        time.sleep(5)
    log(f"   site check: {last}")
    return False


def backups(ftp: FTP, app: str) -> list[str]:
    parent, base = posixpath.split(app)
    names = [posixpath.basename(n) for n in ftp.nlst(parent or ".")]
    found = sorted(n for n in names if n.startswith(base + ".old-"))
    return [posixpath.join(parent, n) if parent else n for n in found]


# --------------------------------------------------------------------------- main

PASSWORD_FILE = os.path.expanduser(os.environ.get("FTP_PASSWORD_FILE", "~/.config/avara-deploy/ftp-password"))


def get_password(user: str, host: str) -> str:
    """FTP_PASSWORD env, else the password file (must be private), else ask on the terminal."""
    if os.environ.get("FTP_PASSWORD"):
        return os.environ["FTP_PASSWORD"]
    if os.path.isfile(PASSWORD_FILE):
        if os.stat(PASSWORD_FILE).st_mode & 0o077:
            sys.exit(f"{PASSWORD_FILE} is readable by other users. Run: chmod 600 {PASSWORD_FILE}")
        with open(PASSWORD_FILE, encoding="utf-8") as f:
            pw = f.read().strip()
        if pw:
            return pw
    if not sys.stdin.isatty():
        sys.exit(
            "No FTP password: no terminal to ask on, FTP_PASSWORD isn't set, and there is no password file.\n"
            f"Save it once (private to you): see 'Password' in DEPLOY.md, file {PASSWORD_FILE}"
        )
    return getpass.getpass(f"FTP password for {user}@{host}: ")


def main() -> None:
    ap = argparse.ArgumentParser(description="Deploy the cPanel package over FTPS.")
    ap.add_argument("zip", nargs="?", help="package zip (default: newest dist/sofa-app-*.zip)")
    ap.add_argument("--host", default=os.environ.get("FTP_HOST", "a001.dapurhosting.com"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("FTP_PORT", "21")))
    ap.add_argument("--user", default=os.environ.get("FTP_USER", "avaraco2"))
    ap.add_argument("--app-dir", default=os.environ.get("FTP_APP_DIR", "sofa-app"))
    ap.add_argument("--url", default=os.environ.get("SITE_URL", "https://sofa.avara.co.id"))
    ap.add_argument("--workers", type=int, default=4, help="parallel FTP connections (default 4)")
    ap.add_argument("--keep-backups", type=int, default=1, help="old app folders to keep (default 1)")
    ap.add_argument("--check-wait", type=int, default=120, help="seconds to wait for the new build to be served")
    ap.add_argument("--rollback", action="store_true", help="switch back to the newest backup folder")
    ap.add_argument("--plain-ftp", action="store_true", help="no TLS (password sent unencrypted; avoid)")
    ap.add_argument("--insecure-tls", action="store_true", help="don't verify the TLS certificate")
    args = ap.parse_args()

    app = args.app_dir.strip("/")
    staging = f"{app}.new"

    password = get_password(args.user, args.host)
    conn = Conn(args.host, args.port, args.user, password, args.plain_ftp, args.insecure_tls)
    pool = Pool(conn, max(1, args.workers))

    log(f"==> Connecting to {args.host} as {args.user}")
    main_ftp = conn.open()
    log(f"   login folder: {main_ftp.pwd()}")
    if not is_dir(main_ftp, app):
        sys.exit(f"'{app}' not found in the FTP login folder. Set --app-dir to the Node.js application root.")

    if args.rollback:
        olds = backups(main_ftp, app)
        if not olds:
            sys.exit("No backup folder to roll back to.")
        failed = f"{app}.failed-{time.strftime('%Y%m%d-%H%M%S')}"
        log(f"==> Rollback: {app} -> {failed}, {olds[-1]} -> {app}")
        main_ftp.rename(app, failed)
        main_ftp.rename(olds[-1], app)
        restart(main_ftp, app)
        log(f"Done. Restarted. Delete '{failed}' in File Manager when no longer needed.")
        return

    zpath = args.zip or max(glob.glob("dist/sofa-app-*.zip"), key=os.path.getmtime, default=None)
    if not zpath:
        sys.exit("No package found. Run `npm run package:cpanel` first.")
    zf, files, dirs, build_id = read_zip(zpath)
    zf.close()
    total = sum(i.file_size for i in files)
    log(f"==> Package {zpath}: {len(files)} files, {total / 1e6:.1f} MB, build {build_id}")

    t0 = time.time()
    if is_dir(main_ftp, staging):
        log(f"==> Removing leftover {staging} from an earlier attempt")
        remove_tree(pool, staging)
    main_ftp.mkd(staging)

    log(f"==> Uploading into {staging} (the live app keeps running)")
    upload(pool, zpath, files, dirs, staging)
    copy_preserved(main_ftp, app, staging)

    backup = f"{app}.old-{time.strftime('%Y%m%d-%H%M%S')}"
    log(f"==> Switching: {app} -> {backup}, {staging} -> {app}")
    main_ftp.rename(app, backup)
    try:
        main_ftp.rename(staging, app)
    except Exception:
        main_ftp.rename(backup, app)  # put the old app back
        raise
    restart(main_ftp, app)
    log(f"   restarted ({time.time() - t0:.0f}s since upload started)")

    log(f"==> Checking {args.url}")
    ok = check_site(args.url.rstrip("/"), build_id, wait=args.check_wait)
    if ok:
        log("   new build is live")
        olds = backups(main_ftp, app)
        for old in olds[: max(0, len(olds) - args.keep_backups)]:
            log(f"==> Deleting old backup {old}")
            remove_tree(pool, old)
    else:
        log(
            "   The site doesn't show the new build yet. Click Restart in cPanel > Setup Node.js App,\n"
            "   and check stderr.log. To go back to the previous version: "
            "python3 scripts/deploy_ftp.py --rollback"
        )

    pool.close()
    main_ftp.quit()
    log("Done." if ok else "Finished with warnings.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
