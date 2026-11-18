import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Report photos are stored as files in UPLOAD_DIR; the DB only keeps their URL
 * ("/api/foto/<name>"). Files are served through an authenticated route, never publicly.
 *
 * File names: u<userId>-<yymmdd>-<random>.<ext>. The user-id prefix lets a pemohon
 * attach and view only their own photos.
 */

export const FOTO_URL_PREFIX = "/api/foto/";
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS_PER_LAPORAN = 10;

const NAME_RE = /^u(\d+)-\d{6}-[a-f0-9]{24}\.(jpg|png|webp)$/;

const TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;
type Ext = keyof typeof TYPES;

let warned = false;
export function uploadDir(): string {
  const dir = process.env.UPLOAD_DIR;
  if (dir) return dir;
  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn("[avara] UPLOAD_DIR is not set; photos go to ./data/uploads and may be lost on redeploy.");
  }
  return path.join(process.cwd(), "data", "uploads");
}

/** Detect the image type from the file's first bytes (don't trust the client's MIME type). */
function sniff(buf: Buffer): Ext | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

function datePart(): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "2-digit", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

export class UploadError extends Error {}

/** Save an image for a user, returns its URL ("/api/foto/<name>"). */
export async function savePhoto(userId: number, buf: Buffer): Promise<string> {
  if (buf.length === 0) throw new UploadError("File foto kosong");
  if (buf.length > MAX_PHOTO_BYTES) throw new UploadError("Ukuran foto maksimal 10 MB");
  const ext = sniff(buf);
  if (!ext) throw new UploadError("Format foto harus JPG, PNG, atau WEBP");

  const name = `u${userId}-${datePart()}-${crypto.randomBytes(12).toString("hex")}.${ext}`;
  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf, { flag: "wx" });
  return FOTO_URL_PREFIX + name;
}

/** Parse a stored photo name; null if it isn't a valid name (also blocks path traversal). */
export function parsePhotoName(name: string): { ownerId: number; contentType: string } | null {
  const m = NAME_RE.exec(name);
  if (!m) return null;
  return { ownerId: Number(m[1]), contentType: TYPES[m[2] as Ext] };
}

export async function readPhoto(name: string): Promise<Buffer | null> {
  if (!parsePhotoName(name)) return null;
  try {
    return await fs.readFile(path.join(uploadDir(), name));
  } catch {
    return null;
  }
}

/** True if `url` is a photo URL uploaded by `userId` that exists on disk. */
export async function isOwnUploadedPhoto(url: unknown, userId: number): Promise<boolean> {
  if (typeof url !== "string" || !url.startsWith(FOTO_URL_PREFIX)) return false;
  const name = url.slice(FOTO_URL_PREFIX.length);
  const info = parsePhotoName(name);
  if (!info || info.ownerId !== userId) return false;
  try {
    await fs.access(path.join(uploadDir(), name));
    return true;
  } catch {
    return false;
  }
}

/** Convert a base64 data URL (old storage format) into a saved file. Returns the URL, or null if invalid. */
export async function dataUrlToPhoto(userId: number, dataUrl: string): Promise<string | null> {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) return null;
  try {
    return await savePhoto(userId, Buffer.from(dataUrl.slice(comma + 1), "base64"));
  } catch {
    return null;
  }
}
