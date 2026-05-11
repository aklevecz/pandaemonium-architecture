#!/bin/bash
# Post-deploy smoke test. Hits the URLs that have silently 404'd twice now
# because of wrangler's content-hash asset deduplication ghosting new
# static files. Exits non-zero on any 404.
#
# Usage: scripts/smoke-deploy.sh
#        or:  scripts/smoke-deploy.sh https://a211h.yaytso.art  (default)
set -e
HOST="${1:-https://a211h.yaytso.art}"

# Static asset endpoints — these are the ones that broke. If any 404 after a
# deploy, touch + rebuild + redeploy fixes it (see commit history).
ASSETS=(
  /robots.txt
  /embeddings.bin
  /embeddings-meta.json
  /readings-fallback.json
  /people.json
  /people-graph.json
  /people-aliases.json
)

# Route endpoints — sanity check the worker is actually serving these.
ROUTES=(
  /
  /search
  /people
  /people/network
  /readings
)

fail=0
for p in "${ASSETS[@]}" "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$HOST$p")
  if [ "$code" = "200" ]; then
    printf "  \033[32mOK\033[0m  %s  %s\n" "$code" "$p"
  else
    printf "  \033[31mFAIL\033[0m %s  %s\n" "$code" "$p"
    fail=1
  fi
done

if [ $fail -ne 0 ]; then
  echo
  echo "One or more endpoints returned non-200. If a *.json or *.bin asset"
  echo "is failing, wrangler's content-hash dedupe likely ghosted it —"
  echo "fix with:  touch static/<file>  &&  npm run build  &&  npx wrangler deploy"
  exit 1
fi
echo
echo "All clear on $HOST"
