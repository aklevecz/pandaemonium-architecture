# scripts/pdf-pipeline/

Multi-stage PDF → markdown pipeline. See `scripts/PDF_PIPELINE.md` for the design.

Each stage writes to `work/<slug>/` (gitignored) so any stage can be re-run independently.

## Stage 1 — triage

```sh
node scripts/pdf-pipeline/triage.js
```

Local-only: uses `pdfinfo`, `pdftotext`, `pdfimages` (all from poppler — `brew install poppler` if missing).

**Outputs:**
- `work/<slug>/metadata.json` — per-PDF classification, text-layer sample, image inventory, chunking plan, warnings.
- `work/triage-summary.json` — the same data for all PDFs in one file.
- A summary table to stdout.

**Classification routes:**

| Class | Stage 3 path |
| --- | --- |
| `born-digital-clean` | `pdftotext -layout` only |
| `mixed` | `pdftotext` per page, OCR fallback per scanned page |
| `scanned` | tesseract per page |
| `notes-heavy` | render to PNG, send images to Claude (skip OCR) |

**Image-only fallback** (`chunking.imageOnlyFallback: true`) flips ON when the PDF exceeds Claude's native PDF input limit (>25MB conservatively). Those PDFs go through the image-only path regardless of classification.

**Chunking** is planned per PDF: 20-page chunks with 2-page overlap on each side (overlap pages let Stage 5 align and dedup at chunk boundaries). The `chunking.ranges` array gives concrete page ranges for downstream stages.

## Stages 2–6

To be implemented. Order: render.js → extract.js → vlm.js → reconcile.js → validate.js, plus a top-level `run.js` that orchestrates them for one slug.
