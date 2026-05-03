#!/bin/bash
# Upload all extracted figures to R2 under figures/<slug>/<file>.
# Public URL: https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/figures/<slug>/<file>
# (matches the same bucket scripts/upload-pdfs.sh pushes to.)
set -e
BUCKET="pandaemonium-pdfs"
PREFIX="figures"
FIGURES_DIR="./static/figures"
PARALLEL="${PARALLEL:-12}"

upload_one() {
  local file="$1"
  local rel="${file#$FIGURES_DIR/}"
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
export BUCKET PREFIX FIGURES_DIR

count=$(find "$FIGURES_DIR" -type f | wc -l | tr -d ' ')
echo "Uploading $count figures with $PARALLEL parallel workers..."
find "$FIGURES_DIR" -type f -print0 | xargs -0 -n 1 -P "$PARALLEL" bash -c 'upload_one "$0"'
echo "Done."
