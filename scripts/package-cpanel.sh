#!/usr/bin/env bash
# Build the app and package it as a zip for cPanel "Setup Node.js App".
# Usage: npm run package:cpanel   ->   dist/sofa-app-<date>-<commit>.zip
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building"
npm run build

OUT=.next/standalone
echo "==> Copying static assets"
# Remove first: cp -r into an existing folder nests it (static/static) and breaks the app.
rm -rf "$OUT/.next/static" "$OUT/public"
cp -r .next/static "$OUT/.next/static"
[ -d public ] && cp -r public "$OUT/public"

# Never ship local secrets or local data.
if find "$OUT" -maxdepth 2 \( -name ".env*" -o -name "data" \) | grep -q .; then
  echo "ERROR: .env file or data/ folder found in $OUT; refusing to package." >&2
  exit 1
fi

mkdir -p dist
STAMP="$(date +%Y%m%d-%H%M)-$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
ZIP="$PWD/dist/sofa-app-$STAMP.zip"
rm -f "$ZIP"
(cd "$OUT" && zip -qr "$ZIP" .)

echo "==> Done: $ZIP ($(du -h "$ZIP" | cut -f1))"
echo "Upload it to the application root in cPanel File Manager, extract, then restart the app."
