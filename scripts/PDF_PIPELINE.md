# PDF → Markdown Pipeline

Plan for redoing PDF parsing with a multi-stage **OCR + VLM** pipeline that handles large PDFs by chunking. This document is a design spec — implementation lives under `scripts/pdf-pipeline/` (TBD).

## Why redo this

The existing `markdown/` was produced by a single-pass tool (Mathpix-flavored: `**==> picture [WxH] intentionally omitted <==**` markers, `**----- Start of picture text -----**` blocks). Failure modes observed in the current corpus:

- **Figures stripped but their text trapped in pseudo-tables.** In the Barad PDF, body text that *visually* sits next to a figure ends up rendered as `|IAN|HACKING,|Representing|and|Intervening|`. Real prose, lost to pipe-delimited cells.
- **Footnote markers garbled.** `Bohr.*°` instead of `Bohr.[10]` or `Bohr.¹⁰`. Footnote bodies are dropped on the floor.
- **No paragraph structure.** Long stretches of prose collapse to a single line; semantic paragraph breaks disappear.
- **Hyphenation/space artifacts.** `ofthe`, `thatis`, `[seminal][contributions][to][the]` — layout-aware extraction failing on ligatures and column wrap.
- **Born-digital PDFs come out fine** (cf. `Tiqqun - The Cybernetic Hypothesis`); the failures concentrate on scanned books and image-heavy notes.
- **Some PDFs are just big.** Two of the "Notes on…" PDFs are >30MB; the largest is 38MB and likely has many full-page images.

The reader UX (notes, highlights, chat) is only as good as the markdown underneath it. Bad text → student highlights anchor on wrong characters; chat assistant cites garbled passages.

## Pipeline stages

```
PDF
 │
 ▼
[1. Triage]──────────────────► metadata.json   (born-digital? scanned? page count, size, has-figures, lang)
 │
 ▼
[2. Chunking]                                   (split into page-range chunks if needed; overlap)
 │
 ▼
[3. Text extraction]──────────► raw_text.md     (pdftotext OR tesseract, depending on triage)
 │
 ▼                                               renders one PNG per page (used by stages 4 + 5)
[4. VLM page-level pass]──────► vlm_pages/*.md  (Claude vision on rendered page + raw text → corrected page md)
 │
 ▼
[5. Reconciliation]───────────► merged.md      (stitch pages, resolve overlap, lift footnotes, fix headings)
 │
 ▼
[6. Validation]───────────────► report.json    (artifact heuristics, manual review queue)
 │
 ▼
markdown/<slug>.md
```

Each stage is a discrete script under `scripts/pdf-pipeline/`, writing to a per-PDF `work/<slug>/` directory so we can re-run any stage independently.

---

### Stage 1 — Triage

**Goal:** decide which extraction path each PDF takes and surface obvious problems before we burn API tokens.

**Inputs:** the PDF.
**Outputs:** `work/<slug>/metadata.json`.

**Checks (all local, no API):**

- `pdfinfo` — pages, PDF version, encrypted?, optimized?
- `pdftotext` first/middle/last page — does a real text layer exist? Heuristic: if extracted chars/page < 200 on >30% of sampled pages → treat as **scanned**.
- `pdfimages -list` — count embedded images per page; flag pages where image area > ~70% of page area.
- File size, page count → chunking decision (see Stage 2).
- Detect language (assume English by default; flag any page where English-token ratio < 0.6 — covers French quotes in Tiqqun, German in Diederichsen, etc.).
- Detect "figure-heavy" pages (many small images, or one full-page image) → mark for VLM-priority.

**Classification → routing:**

| Class | Signal | Stage 3 path |
| --- | --- | --- |
| `born-digital-clean` | full text layer, no scanned-image pages | `pdftotext -layout` only; VLM pass becomes a light verifier |
| `mixed` | text layer present but some scanned pages or many figures | `pdftotext -layout` per page, fall back to OCR per scanned page |
| `scanned` | no usable text layer | render → Tesseract OCR per page |
| `notes-heavy` | many full-page images (the "Notes on…" Benzel PDFs) | render at higher DPI; VLM pass does most of the work |

### Stage 2 — Chunking

**Goal:** keep every chunk inside Claude's PDF input limit (100 pages / 32MB at the time of writing) and inside a reasonable per-call token budget.

**Outputs:** `work/<slug>/chunks/chunk_NN.pdf` (or just page-range manifest — we don't have to materialize).

**Rules:**

1. Default chunk = **20 pages with 2 pages of overlap** on each side. Overlap exists so reconciliation (Stage 5) has a join region to align.
2. **Prefer semantic boundaries** when cheap to find. Use `pdftotext` of the table of contents (if present) or detect heading-like lines (all caps, leading numerals, font-size jumps) to nudge chunk boundaries to chapter/section starts. Do NOT spend a Claude call on this — it's a heuristic improvement, not a requirement.
3. **Hard cap**: if a single chunk PDF would still exceed 25MB after the 20-page split, render the chunk to images and skip native PDF input entirely (image-only path through Claude).
4. **Page-image rendering**: for every chunk, also render each page as a 2x DPI PNG to `work/<slug>/pages/page_NNNN.png`. This is the input shared by Stage 4 (VLM pass) and Stage 6 (validation).

For most of the corpus a single chunk is fine. The 38MB / 33MB Benzel notes will need 2–3 chunks each, and the 80-page Tiqqun is one chunk only because it's born-digital and tiny on disk.

### Stage 3 — Text extraction

**Goal:** produce a per-page raw markdown that the VLM pass can correct against.

**Why per-page, not whole-doc:** keeps the VLM input small enough to do a focused page-level diff in Stage 4, and lets us re-run a single bad page without redoing the whole document.

**Routes:**

- **Born-digital path:** `pdftotext -layout -nopgbrk -enc UTF-8 chunk.pdf -` then split on form-feeds; per-page text is dumped to `work/<slug>/raw/page_NNNN.txt`. Layout mode preserves columns; we'll un-column in Stage 4.
- **OCR path:** `tesseract page_NNNN.png page_NNNN -l eng --psm 1 hocr txt`. PSM 1 = automatic page segmentation with OSD (handles rotated scans). hOCR output preserves position info, which we keep for Stage 5 footnote lifting.
- **Mixed path:** triage decides per-page; same outputs.

**Important:** never silently merge the two paths within one page. Pick one, record which in metadata, and let Stage 4 see it.

### Stage 4 — VLM page-level pass (the core fix)

**Goal:** for every page, send `(page image, raw extracted text)` to Claude with vision and get back **clean, structured markdown for that page**.

**Model:** `claude-sonnet-4-20250514` (same model the chat endpoint uses; we already pay for that key). For pages flagged "figure-heavy" or "scanned-low-confidence", upgrade to Opus.

**Per-page request shape:**

- Image: rendered page PNG.
- Text block: the raw OCR / pdftotext output for this page.
- System prompt enforcing:
  - Output is **markdown only**, no commentary.
  - Preserve original paragraph breaks (don't merge, don't split).
  - Lift footnote markers to `[^N]` with footnote bodies collected into a `<!-- FOOTNOTES -->` block at the bottom of the page.
  - For figures: emit `![Figure: short description](#fig-page-N-i)` and a `> **Caption:** …` blockquote underneath. **Do not** drop figure-internal text — if a figure contains body text that is part of the reading (e.g. an inline diagram quoting the author), include it in the caption block clearly marked.
  - Headings: identify level by visual hierarchy in the image, not by guessing from text alone.
  - Fix de-hyphenation across line breaks (`hyphen-\nation` → `hyphenation`).
  - Don't translate, don't paraphrase, don't summarize.
- Temperature 0. Cache the system prompt across all pages (prompt caching cuts cost dramatically on a multi-page run).

**Why image + text instead of image alone:** Claude vision is strong but not free of OCR errors of its own — particularly on small footnote text and obscure proper nouns. Showing it the OCR text gives it a starting point and lets it correct rather than re-derive. Tradeoff documented; we should A/B this on the test PDF (see "Test plan").

**Output:** `work/<slug>/vlm/page_NNNN.md`.

### Stage 5 — Reconciliation / stitching

**Goal:** turn the per-page markdown into one coherent document.

**Steps:**

1. **Concatenate** in page order.
2. **Resolve overlap regions** (introduced in Stage 2) by string-aligning the last N lines of chunk K with the first N lines of chunk K+1 and keeping one copy.
3. **Re-anchor footnotes**: page-local `[^N]` markers get rewritten to document-global IDs (`[^p3-1]`). Footnote bodies migrate to a single document-end section.
4. **Heading normalization**: if Stage 4 over-promoted ad-hoc bold lines to `##`, demote inconsistent ones (heuristic: if a heading is shorter than 4 words AND occurs once AND has body text immediately preceding without a paragraph break, downgrade).
5. **Strip page-number runts**: lines that are just `133`, `INTRA-ACTIONS MATTER`, `AGENTIAL REALISM 137` — running headers/footers — get pattern-matched and removed.
6. **Hyphenation pass**: catch any `ofthe`/`thatis`/etc. that survived. Use a wordlist diff against a basic English dictionary.

**Output:** `markdown/<slug>.md` (drop-in replacement for the existing file).

### Stage 6 — Validation

**Goal:** flag PDFs that need a human look before we ship the new markdown.

**Heuristics (all local):**

- Char count of new markdown vs old markdown — if it dropped by >15%, flag.
- Presence of leftover artifacts: `|||`, `==> picture`, `*°`, runs of `[word]` brackets.
- Footnote markers without matching footnote bodies (or vice versa).
- Pages where Stage 4 returned suspiciously short markdown (< 200 chars on a non-blank page).
- Random spot-check: pick 3 pages per PDF, render them side-by-side with the new markdown, drop into a `report.html` for human review.

Output: `work/<slug>/report.json` + a project-wide `work/index.html` summary table.

---

## Chunking strategy in more detail

The design choices and the reasoning, since this is the part the user explicitly asked about:

| Constraint | Choice | Reason |
| --- | --- | --- |
| Claude PDF input limit | 100 pages / 32MB | Stay well under: 20 pages/chunk |
| Avoid splitting mid-paragraph | 2-page overlap on each side + Stage 5 overlap dedup | Cheap insurance; alignment in Stage 5 is a few lines of diff |
| Want chapter-aligned chunks where possible | Heading detection nudges boundaries by ±3 pages | Better reading experience, but not load-bearing |
| Some PDFs are scanned at high DPI and bloat as PDFs | Render to PNG, send images instead of PDF | Bypasses PDF size limit for the worst Benzel PDFs |
| Want re-runnable per chunk | Each chunk is a directory with its own raw/, vlm/ outputs | Lets us fix one bad chunk without redoing the doc |

**Worked example (the Barad PDF, 54 pages, 3.7MB, born-digital with figures):**
- 1 chunk (under 20-page-and-32MB threshold? No — over 20 pages, so split).
- Actually: 3 chunks of 20/20/14 + 2-page overlap → chunk_01 = pp 1-22, chunk_02 = pp 19-42, chunk_03 = pp 39-54.
- Born-digital → pdftotext path for raw extraction.
- Many figures with embedded text → every page goes through Stage 4 VLM.
- Stage 5 dedups overlap, lifts footnotes (Barad has heavy footnoting), strips running heads.

**Worked example ("Notes on Polybius", 37 pages, 33MB, image-heavy):**
- File is 33MB → over Claude PDF limit.
- 2 chunks of 20/19 with 2-page overlap, each rendered to PNGs.
- Triage marks as `notes-heavy` → render at 2x DPI, skip pdftotext, send images straight to Claude with empty raw-text prompt.
- Validation will be hand-checked because there's no text-layer ground truth to compare to.

---

## Test plan

We pick **one complex PDF** to validate the whole pipeline before running it on the corpus.

**Recommended test PDF: `Karen Barad, Agential Realism …`** (54pp, 3.7MB).

Why this one:
- Triggers every failure mode in the current corpus: scanned-but-with-text-layer, embedded figures with body text, heavy footnoting, running heads.
- Long enough to exercise chunking + overlap reconciliation.
- We have a known-bad reference (current `markdown/`) to diff against.
- Not so large it becomes a multi-hour debugging loop.

**Acceptance criteria:**
1. New markdown contains zero `==> picture` markers, zero `|||` table fragments, zero `*°` footnote stars.
2. The Bohr poster page (currently page with `**==> picture [407 x 328] intentionally omitted <==**`) renders as `![Figure: …](…)` + caption blockquote, with the caption text intact and **not** trapped in a pseudo-table.
3. Footnotes appear at end of document with correct numeric anchors; spot-check 5 footnote markers and confirm each has a body.
4. Paragraph count in new markdown is within ±10% of paragraph count in a hand-paragraphed reference page (we'll prepare one page of ground truth).
5. Char count is ≥95% of the current markdown's char count (the missing 5% is acceptable loss to running heads + page numbers).
6. Random hand-read of 3 pages: no joined-word artifacts (`ofthe`, `thatis`).

If 1–6 pass on Barad: run the pipeline on the rest of the corpus, hand-review the validation report, ship.

If they don't: iterate on Stage 4 prompt before spending budget on the rest.

---

## Implementation order (suggested)

1. `scripts/pdf-pipeline/triage.js` — Stage 1, no API calls. Easy to validate.
2. `scripts/pdf-pipeline/extract.js` — Stage 3 wrapper around `pdftotext` + `tesseract`.
3. `scripts/pdf-pipeline/render.js` — page → PNG via `pdftoppm` (already in poppler).
4. `scripts/pdf-pipeline/vlm.js` — Stage 4. Single page first; verify output shape; then loop.
5. `scripts/pdf-pipeline/reconcile.js` — Stage 5.
6. `scripts/pdf-pipeline/validate.js` — Stage 6.
7. `scripts/pdf-pipeline/run.js` — orchestrates 1–6 for one PDF.
8. Run on Barad. Iterate.
9. Run on the corpus.
10. Diff `markdown/` before/after, regenerate `src/lib/data/reading-content.ts` via `npm run build`, smoke-test the reader UI on 2–3 readings.

## Open questions to settle before implementation

- Do we cache page PNGs to R2, or keep them local under `work/`? (Cost vs. reproducibility — local for now.)
- Do we want to keep the old `markdown/` as `markdown.legacy/` for one cycle so the chat assistant can fall back if students notice regressions? (Recommend yes.)
- Tesseract trained data: stock English is fine for most of the corpus, but a few PDFs have French/German pull-quotes — install `eng+fra+deu` traineddata.
- Footnote ID scheme: `[^p3-1]` (page-local) vs `[^1]` (global) — page-local is more robust to reconciliation glitches; recommend page-local.

## Cost estimate (rough)

~1100 pages of corpus × 1 Sonnet vision call/page ≈ in the low tens of dollars one-time, with prompt caching. Re-runs of single pages during iteration are negligible. Worth budgeting separately from the chat assistant key.
