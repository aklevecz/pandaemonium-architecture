# scripts/pdf-pipeline/

Multi-stage PDF → markdown pipeline. `scripts/PDF_PIPELINE.md` has the original
design; this file describes what actually exists.

Each stage writes to `work/<slug>/` (gitignored) so any stage can be re-run
independently. Stages share `--all` / `<slug>` / `--class=<name>` argument
handling via `lib/work.js` (slugs match on unique prefix).

Requires `poppler` (`pdfinfo`, `pdftotext`, `pdfimages`, `pdftoppm`) and
`tesseract`, both from Homebrew. The VLM stages need `GEMINI_API_KEY` in `.env`.

## Running it end to end

There is no orchestrator; stages are run by hand in this order.

```sh
node scripts/pdf-pipeline/triage.js             # no args — always does all of PDFs/
node scripts/pdf-pipeline/render.js --all       # pages → PNG
node scripts/pdf-pipeline/extract.js --all      # text layer → raw/
node scripts/pdf-pipeline/figures.js --all      # embedded images → figures/
node scripts/pdf-pipeline/vlm.js <slug>         # the expensive one; per page
node scripts/pdf-pipeline/fallback.js --all     # backfill pages the VLM refused
node scripts/pdf-pipeline/reconcile.js --all    # → markdown/<name>.md.new
# review the diffs, then promote the .md.new files over the .md
node scripts/pdf-pipeline/validate.js --all     # report defects
bash scripts/upload-figures.sh                  # push work/*/figures/ to R2
npm run build                                   # regenerate static/reading-content/
```

`scripts/figures-vlm-crop.js <slug>` is a separate figure path for scanned
books (see Stage 5b). Run it after `vlm.js`, then re-run with `--inject`.

## Stages

**1. Triage** (`triage.js`) — `pdfinfo` + `pdftotext` sampling + `pdfimages
-list` produce `work/<slug>/metadata.json` and `work/triage-summary.json`.
Classifies each PDF, which routes everything downstream:

| Class | Extraction path |
| --- | --- |
| `born-digital-clean` | `pdftotext -layout` |
| `mixed` | `pdftotext` per page |
| `scanned` | render only; the VLM does the reading |
| `notes-heavy` | render only; the VLM does the reading |

Beyond the spec it also checks the ASCII-letter ratio, which catches PDFs whose
private-use font encodings make `pdftotext` return gibberish — that check is why
Barad classifies as `scanned` despite being born-digital.

**2. Chunking — vestigial.** `triage.js` still computes `chunking.ranges` and
`imageOnlyFallback` into metadata, but nothing reads them. Stage 4 became
strictly per-page (one image per request), so the page/size limits that
motivated chunking no longer apply. The overlap-dedup step the design called
for in Stage 5 is likewise moot: there are no overlaps.

**3. Extract** (`extract.js`) — per-page `pdftotext -layout` →
`raw/page_NNNN.txt`. `scanned` and `notes-heavy` skip this stage by design and
record a `skipped-<class>` manifest.

**4. VLM** (`vlm.js`) — the core stage. Sends each page's rendered PNG plus its
raw text to Gemini and gets back clean markdown → `vlm/page_NNNN.md`.

Runs on **Gemini, not Claude**, contrary to the design doc: Anthropic's content
filter refuses even benign academic page images on this corpus (verified with
Barad pages 1 and 14). Primary model `gemini-3.1-flash-lite-preview`, override
with `PDF_PIPELINE_MODEL`. Concurrency defaults to 3 (`--concurrency=N`),
temperature 0, resumable (an existing `page_NNNN.md` is skipped unless
`--force`). Transient 429/5xx failures retry 5 times with exponential backoff.

When Gemini returns `finishReason=RECITATION` — its copyright filter, which
fires on near-verbatim book pages — `scanned` and `notes-heavy` pages retry once
on `gemini-3.1-pro-preview`. Pages it still refuses are left to `fallback.js`.

**5. Fallback** (`fallback.js`) — fills any `vlm/page_NNNN.md` the VLM never
produced, degrading through four tiers so a refused page never ships blank:

1. pre-extracted `raw/page_NNNN.txt`
2. on-demand `pdftotext` for that one page (classes that skipped Stage 3)
3. local `tesseract` OCR of the rendered page — for pages with no text layer
   at all, the only case the hosted VLM leaves nothing to fall back on
4. an `<!-- extraction failed -->` placeholder

**5b. Figures** — two independent mechanisms:

- `figures.js` extracts embedded image XObjects with `pdfimages`, drops
  anything under 50px as hairlines/rules, and writes `figures.json` mapping
  page → `{file, urlPath, width, height}`. `reconcile.js` substitutes those
  URLs into the VLM's `![Figure: …](#fig-pN-i)` placeholders positionally.
- `figures-vlm-crop.js <slug>` handles scanned books where figures are baked
  into full-page scans and `pdfimages` finds nothing. It asks Gemini for each
  figure's bounding box, then crops that region out of the PDF with `pdftoppm`.
  `--inject` rewrites the markdown afterwards.

Figures live only in R2 (`figures/<slug>/<file>`); `work/*/figures/` is
gitignored and `static/` deliberately doesn't carry them — they'd add ~225MB to
every Worker deploy. `figures.js` checks that the files a cached manifest
names still exist, so a manifest without its images re-extracts rather than
reporting a hit and leaving `upload-figures.sh` with nothing to push.

**6. Reconcile** (`reconcile.js`) — stitches pages into one document: strips
running heads and page numbers, folds multi-line headings, substitutes figure
URLs, and lifts footnote bodies into a `## Notes` section. Writes
`markdown/<name>.md.new`; promoting it over the `.md` is a manual step.

Two footnote behaviors worth knowing: a footnote number reused by a later page
(chapters restarting their numbering) gets a `-pN` suffix so its body isn't
dropped, and a marker whose body appears nowhere in the source — the norm for
chapter excerpts, where the endnotes live at the back of a book the PDF doesn't
include — is demoted to a plain `<sup>` so it doesn't reach the reader as a
literal `[^12]`.

**7. Validate** (`validate.js`) — reports defects per reading and corpus-wide:
orphaned/unused footnotes, extraction-failure placeholders, unresolved figure
markers, short VLM pages, residual legacy artifacts, and char-ratio regressions.
Writes `work/<slug>/report.json` and `work/validation-summary.json`. Always
exits 0 — it's a report, not a gate.

Note the char-ratio check compares against the previous `markdown/` file, so
once a `.md.new` has been promoted the comparison is against the pipeline's own
prior output. `validate.js` marks a ratio of exactly 1 as `stale` for that
reason.
