#!/bin/bash
# Upload extracted figures to R2 under figures/<slug>/<file>.
# Public URL: https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/figures/<slug>/<file>
# (matches the same bucket scripts/upload-pdfs.sh pushes to.)
#
# Reads from work/<slug>/figures/<file> — the staging dir written by
# scripts/pdf-pipeline/figures.js and scripts/figures-vlm-crop.js. Deliberately
# NOT static/figures/ so the Worker deploy doesn't ship 200+ MB of figures
# Cloudflare also has on R2.
#
# Incremental: successfully uploaded keys are recorded in work/.figures-uploaded
# as "key<TAB>bytes" and skipped next run unless the file's size changed. That
# makes a no-op run instant, which is what lets `npm run deploy` call this every
# time — the markdown references R2 URLs, so a deploy that skips this step ships
# broken images. Pass --force to re-upload everything.
#
# Exits non-zero if any upload failed. It used to exit 0 regardless, so an
# expired token looked identical to a successful run.
set -euo pipefail
BUCKET="pandaemonium-pdfs"
PREFIX="figures"
WORK_DIR="./work"
PARALLEL="${PARALLEL:-12}"
LEDGER="$WORK_DIR/.figures-uploaded"
FAILED="$(mktemp)"
trap 'rm -f "$FAILED"' EXIT

[ "${1:-}" = "--force" ] && rm -f "$LEDGER"
touch "$LEDGER"

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
    # Short line, single append — atomic enough across the worker pool.
    printf "%s\t%s\n" "$rel" "$(wc -c < "$file" | tr -d ' ')" >> "$LEDGER"
  else
    printf "ERR %s\n" "$rel" >&2
    printf "x\n" >> "$FAILED"
  fi
}
export -f upload_one
export BUCKET PREFIX WORK_DIR LEDGER FAILED

# Build the pending list: every figure whose "key<TAB>bytes" isn't already in
# the ledger. Size is part of the key so a re-cropped figure re-uploads.
pending="$(mktemp)"
while IFS= read -r file; do
  rel="${file#$WORK_DIR/}"
  rel="${rel/\/figures\//\/}"
  entry="$rel	$(wc -c < "$file" | tr -d ' ')"
  grep -qxF "$entry" "$LEDGER" || printf "%s\0" "$file"
done < <(find "$WORK_DIR" -type f -path "*/figures/*" 2>/dev/null) > "$pending"

count=$(tr -cd '\0' < "$pending" | wc -c | tr -d ' ')
total=$(find "$WORK_DIR" -type f -path "*/figures/*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$count" -eq 0 ]; then
  echo "All $total figures already uploaded (ledger: $LEDGER). Nothing to do."
  rm -f "$pending"
  exit 0
fi

echo "Uploading $count of $total figures with $PARALLEL parallel workers..."
xargs -0 -n 1 -P "$PARALLEL" bash -c 'upload_one "$0"' < "$pending" || true
rm -f "$pending"

nfail=$(wc -l < "$FAILED" | tr -d ' ')
if [ "$nfail" -gt 0 ]; then
  echo "FAILED: $nfail uploads did not succeed." >&2
  echo "If these are 403s, the Cloudflare token lacks R2 write access — run 'npx wrangler login'." >&2
  exit 1
fi
echo "Done. $count uploaded."
