#!/bin/bash
# Upload all extracted figures to R2 under figures/<slug>/<file>.
# Public URL: https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/figures/<slug>/<file>
# (matches the same bucket scripts/upload-pdfs.sh pushes to.)
#
# Reads from work/<slug>/figures/<file> — i.e. the staging dir written by
# scripts/pdf-pipeline/figures.js. Deliberately NOT static/figures/ so the
# Worker deploy doesn't ship 200+ MB of figures Cloudflare also has on R2.
set -e
BUCKET="pandaemonium-pdfs"
PREFIX="figures"
WORK_DIR="./work"
PARALLEL="${PARALLEL:-12}"

upload_one() {
  local file="$1"
  # Path is work/<slug>/figures/<filename> — strip the wrapper to get
  # <slug>/<filename> for the R2 key.
  local rel="${file#$WORK_DIR/}"
  rel="${rel/\/figures\//\/}"
  local ext
  ext=$(printf "%s" "${file##*.}" | tr '[:upper:]' '[:lower:]')
  local ct
  case "$ext" in
    png) ct="image/png" ;;
    jpg|jpeg) ct="image/jpeg" ;;
    tif|tiff) ct="image/tiff" ;;
    *) ct="application/octet-stream" ;;
  esac
  if npx wrangler r2 object put "$BUCKET/$PREFIX/$rel" --file "$file" --content-type "$ct" --remote >/dev/null 2>&1; then
    printf "OK  %s\n" "$rel"
  else
    printf "ERR %s\n" "$rel" >&2
  fi
}
export -f upload_one
export BUCKET PREFIX WORK_DIR

count=$(find "$WORK_DIR" -type f -path "*/figures/*" 2>/dev/null | wc -l | tr -d ' ')
echo "Uploading $count figures with $PARALLEL parallel workers..."
find "$WORK_DIR" -type f -path "*/figures/*" -print0 | xargs -0 -n 1 -P "$PARALLEL" bash -c 'upload_one "$0"'
echo "Done."
