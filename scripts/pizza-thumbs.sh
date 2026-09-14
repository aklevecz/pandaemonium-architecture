#!/bin/bash
# Build the browser-servable assets for /pizza from a finished run of
# scripts/pizza-distribution.mjs.
#
# The run itself leaves ~900MB of full-size JPEGs under work/, which is
# gitignored and far too heavy to serve. This produces two resized sets plus
# the id→label index the page joins on, all under static/pizza/ (also
# gitignored, so a fresh clone has none of it until you re-run this).
#
#   bash scripts/pizza-thumbs.sh                  # default: the pizza run
#   bash scripts/pizza-thumbs.sh a-doctor         # a different prompt's run
#
# Requires ImageMagick (`brew install imagemagick`).
set -euo pipefail

SLUG="${1:-pizza}"
SRC="work/prompt-distribution-${SLUG}"
OUT="static/pizza"

[ -d "$SRC/images" ] || { echo "no images at $SRC/images — run scripts/pizza-distribution.mjs first" >&2; exit 1; }
command -v magick >/dev/null || { echo "magick not found — brew install imagemagick" >&2; exit 1; }

mkdir -p "$OUT/thumbs" "$OUT/large"

# 240px wide feeds the contact sheet; 720px is what the lightbox shows, which
# is enough to read on a projector without shipping the originals.
echo "resizing $(ls "$SRC"/images/*.jpg | wc -l | tr -d ' ') images…"
ls "$SRC"/images/*.jpg | xargs -P 8 -I{} sh -c '
  b=$(basename "{}")
  magick "{}" -resize 240x -quality 70 -strip "'"$OUT"'/thumbs/$b"
  magick "{}" -resize 720x -quality 78 -strip "'"$OUT"'/large/$b"
'

# A continuous measurement per image. The categorical axes collapse to nearly
# one picture; brightness does not, and across a large sample it lands on a
# normal. The page plots it beside the bars, so this file has to carry it.
echo "measuring brightness…"
ls "$SRC"/images/*.jpg | xargs -P 8 -I{} sh -c '
  b=$(basename "{}" .jpg)
  printf "%s %s\n" "$b" "$(magick "{}" -colorspace Gray -format "%[fx:mean]" info:)"
' > "$SRC/brightness.txt"

# One compact file the page can fetch: every label with the image id and its
# measurement attached. results.json stores labels without ids, so it cannot be
# joined to the grid on its own.
python3 - "$SRC" "$OUT" <<'PY'
import json, os, sys, glob
src, out = sys.argv[1], sys.argv[2]

bright = {}
bpath = os.path.join(src, 'brightness.txt')
if os.path.exists(bpath):
    for line in open(bpath):
        parts = line.split()
        if len(parts) >= 2:
            bright[parts[0]] = round(float(parts[1]), 5)

rows = []
for f in sorted(glob.glob(os.path.join(src, 'labels', '*.json'))):
    lab = json.load(open(f))
    lab['id'] = os.path.basename(f).replace('.json', '')
    if lab['id'] in bright:
        lab['brightness'] = bright[lab['id']]
    rows.append(lab)

meta = json.load(open(os.path.join(src, 'results.json')))
json.dump({
    'prompt': meta.get('prompt'),
    'model': meta.get('model'),
    'n': len(rows),
    'axes': ['form', 'view', 'toppings', 'style', 'setting', 'crust', 'people_visible', 'slice_removed'],
    'measures': ['brightness'],
    'items': rows,
}, open(os.path.join(out, 'labels.json'), 'w'), separators=(',', ':'))
print(f"labels.json: {len(rows)} items, {len(bright)} with brightness")
PY

echo "done → $OUT ($(du -sh "$OUT" | cut -f1))"
