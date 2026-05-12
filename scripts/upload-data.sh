#!/bin/bash
# Upload the large generated data files to R2. Cloudflare's Workers Static
# Assets service evicts large infrequent files between deploys, breaking
# /people, /search, /play, etc. R2 doesn't have that problem.
#
# Files end up at:
#   https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/data/<filename>
#
# Run:
#   bash scripts/upload-data.sh
set -e
BUCKET="pandaemonium-pdfs"
PREFIX="data"

# Static files at the root of static/ — uploaded individually.
FILES=(
  static/embeddings.bin
  static/embeddings-meta.json
  static/people.json
  static/people-graph.json
  static/people-aliases.json
  static/readings-fallback.json
  static/summaries-index.json
)

upload_one() {
  local path="$1"
  local key="$2"
  local ext="${path##*.}"
  local ct
  case "$ext" in
    json) ct="application/json" ;;
    bin)  ct="application/octet-stream" ;;
    md)   ct="text/markdown" ;;
    *)    ct="application/octet-stream" ;;
  esac
  if npx wrangler r2 object put "$BUCKET/$key" --file "$path" --content-type "$ct" --remote >/dev/null 2>&1; then
    printf "OK  %s\n" "$key"
  else
    printf "ERR %s\n" "$key" >&2
  fi
}
export -f upload_one
export BUCKET PREFIX

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "skip (missing): $f"
    continue
  fi
  upload_one "$f" "$PREFIX/$(basename "$f")"
done

# Per-summary files — there's one per reading.
if [ -d static/summaries ]; then
  count=$(find static/summaries -name '*.json' | wc -l | tr -d ' ')
  echo "Uploading $count summary files…"
  find static/summaries -name '*.json' -print0 | xargs -0 -n 1 -P 12 bash -c '
    f="$0"
    rel="${f#static/}"
    upload_one "$f" "$PREFIX/$rel"
  '
fi

echo "Done. Files available at https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/$PREFIX/<filename>"
