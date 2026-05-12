#!/bin/bash
# Post-deploy smoke test. Verifies the worker is serving routes and that
# the large data files on R2 are reachable. The big JSONs (people,
# embeddings, summaries) used to live in Cloudflare static assets but
# kept getting evicted between deploys, so they now live in R2.
#
# Usage: scripts/smoke-deploy.sh
#        or:  scripts/smoke-deploy.sh https://a211h.yaytso.art  (default)
set -e
HOST="${1:-https://a211h.yaytso.art}"
R2="https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/data"

# Small static assets still on Cloudflare's asset bucket.
ASSETS=(
  /robots.txt
)

# Large data files on R2. Hit R2 directly — these aren't served at /<file>
# on the worker anymore; loaders fetch them server-side.
R2_FILES=(
  /embeddings.bin
  /embeddings-meta.json
  /readings-fallback.json
  /people.json
  /people-graph.json
  /people-aliases.json
  /summaries-index.json
)

# Route endpoints — sanity check the worker is serving these.
ROUTES=(
  /
  /search
  /people
  /people/network
  /readings
  /play
  /play/debate
  /play/adventure
)

fail=0
for p in "${ASSETS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$HOST$p")
  if [ "$code" = "200" ]; then
    printf "  \033[32mOK\033[0m  %s  %s\n" "$code" "$HOST$p"
  else
    printf "  \033[31mFAIL\033[0m %s  %s\n" "$code" "$HOST$p"
    fail=1
  fi
done

for p in "${R2_FILES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$R2$p")
  if [ "$code" = "200" ]; then
    printf "  \033[32mOK\033[0m  %s  %s\n" "$code" "$R2$p"
  else
    printf "  \033[31mFAIL\033[0m %s  %s\n" "$code" "$R2$p"
    fail=1
  fi
done

for p in "${ROUTES[@]}"; do
  # Routes behind auth may return 302/303 — count those as OK.
  code=$(curl -s -o /dev/null -w "%{http_code}" "$HOST$p")
  if [ "$code" = "200" ] || [ "$code" = "302" ] || [ "$code" = "303" ]; then
    printf "  \033[32mOK\033[0m  %s  %s\n" "$code" "$HOST$p"
  else
    printf "  \033[31mFAIL\033[0m %s  %s\n" "$code" "$HOST$p"
    fail=1
  fi
done

if [ $fail -ne 0 ]; then
  echo
  echo "One or more endpoints returned a bad status."
  echo "  - R2 misses: re-run  scripts/upload-data.sh"
  echo "  - Worker misses: check  npx wrangler tail  for the failing route"
  exit 1
fi
echo
echo "All clear on $HOST"
