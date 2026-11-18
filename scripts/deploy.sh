#!/usr/bin/env bash
# Build, package and deploy to cPanel over FTPS in one step.
#   ./scripts/deploy.sh             build + upload + switch + restart
#   ./scripts/deploy.sh --rollback  go back to the previous version
# FTP password: FTP_PASSWORD, or ~/.config/avara-deploy/ftp-password (chmod 600), or typed when asked. See scripts/deploy_ftp.py for options.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" = "--rollback" ]; then
  exec python3 scripts/deploy_ftp.py --rollback
fi

# Fail before the 1-minute build if there's no way to get the FTP password.
PWFILE="${FTP_PASSWORD_FILE:-$HOME/.config/avara-deploy/ftp-password}"
if [ -z "${FTP_PASSWORD:-}" ] && [ ! -s "$PWFILE" ] && [ ! -t 0 ]; then
  echo "No FTP password available (no terminal to ask on). Save it once:" >&2
  echo "  mkdir -p ~/.config/avara-deploy && read -rs P && printf '%s' \"\$P\" > $PWFILE && chmod 600 $PWFILE" >&2
  exit 1
fi

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "Note: deploying uncommitted changes."
fi

npm run package:cpanel
ZIP="$(ls -t dist/sofa-app-*.zip | head -1)"
python3 scripts/deploy_ftp.py "$ZIP" "$@"

# Keep only the newest 3 local packages.
ls -t dist/sofa-app-*.zip | tail -n +4 | xargs -r rm -f
