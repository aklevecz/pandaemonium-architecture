# Readings still to source

Three readings are assigned in the **Fall 2026** syllabus and have no text in
the app. Everything else on the syllabus is present and working (76 readings,
all reachable, all 75 PDF links and 419 figure images resolving).

Last checked: 2026-08-08.

---

## 1. Aaron French — "The Mandela Effect and New Memory"

**Week 3**, primary reading
*Correspondences* 6, no. 2 (2018): 201–233
**Open access — free**

- Direct PDF: `correspondencesjournal.com/ojs/ojs/index.php/home/article/view/70/69`
- Article page: <https://www.correspondencesjournal.com/ojs/ojs/index.php/home/article/view/70>
- Mirrors, if the journal misbehaves:
  - <https://www.academia.edu/38367838/The_Mandela_Effect_and_New_Memory>
  - <https://www.researchgate.net/publication/366973326_The_Mandela_Effect_and_New_Memory>

**Why it needs a human:** the journal's firewall returns `455 Security Incident
Detected — Your request was blocked. Do not retry.` It opens normally in a
browser.

This is the French essay that Benzel's *Notes on New Memory* quotes at length,
so it's additive rather than duplicative.

Save as:

```
PDFs/Aaron French, The Mandela Effect and New Memory.pdf
```

---

## 2. Benjamin A. Olsho — "A Cross-sectional Analysis of the Hollywood Stock Exchange's Forecasting Accuracy and Risk vs. Return Relationships"

**Week 9**, additional reading
Penn State honors thesis, 2013
**Open access — free**

- Landing page (click the download link there):
  <https://honors.libraries.psu.edu/catalog/17484>

**Why it needs a human:** PSU returns 403 to automated requests — including via
the session-tokenized download URL and through a real browser session. A human
click works.

Save as:

```
PDFs/additional_reading_primary_documents/Benjamin A. Olsho, A Cross-Sectional Analysis of the Hollywood Stock Exchange.pdf
```

---

## 3. Cory Doctorow — *The Reverse Centaur's Guide to Life After AI*

**Week 7**, primary reading
Farrar, Straus and Giroux / Verso, 23 June 2026
**In copyright — purchase required**

- <https://www.versobooks.com/products/3584-the-reverse-centaur-s-guide-to-life-after-ai>
- <https://www.amazon.com/Reverse-Centaurs-Guide-Life-After/dp/037462156X>

This is a **real and distinct book**, published June 2026 — not a retitling of
anything already in the corpus. The repo has *Revenge of the Chickenized
Reverse-Centaurs* (a 2022 Pluralistic essay): same concept, different text.
That essay is currently wired into week 7 as a placeholder and should be
swapped once an excerpt exists.

The syllabus says "from", so this needs a scanned chapter excerpt, like the
other book excerpts in the corpus (Bratton, Schüll, Millar, Negarestani).

Save as:

```
PDFs/Cory Doctorow, from The Reverse Centaurs Guide to Life After AI.pdf
```

---

## Adding one once you have it

Hand it off, or run the pipeline yourself:

```bash
node scripts/pdf-pipeline/triage.js
node scripts/pdf-pipeline/render.js <slug>
node scripts/pdf-pipeline/extract.js <slug>
node scripts/pdf-pipeline/figures.js <slug>
node scripts/pdf-pipeline/vlm.js <slug>
node scripts/pdf-pipeline/fallback.js <slug>
node scripts/pdf-pipeline/reconcile.js <slug>
```

Then review the generated `markdown/<name>.md.new`, rename it over the `.md`,
add the entry to `src/lib/data/syllabus.ts`, and `npm run deploy`.

`<slug>` matches on a unique prefix — `aaron-french` is enough.

Two things worth knowing:

- **`triage.js` rewrites every `metadata.json`.** That sounds alarming but it's
  deterministic: all 72 existing classifications came back byte-identical
  across a re-run, so it's safe.
- **Avoid `?` and `#` in filenames.** Not strictly required — the two files
  renamed for this turned out to be blocked by an expired token, not the
  characters — but they're URL-special and worth dodging.

## Don't re-run the pipeline on these two

`Incogni Research, The Great Digital Fatigue` and
`Yancey Strickler, The Dark Forest Theory of the Internet` have `work/` dirs
from a triage run, but their markdown was **hand-authored from the source web
pages**, which is more faithful than OCR'ing a print-to-PDF of a web article.
`reconcile --all` skips them safely (it iterates work dirs that have VLM
output), but running `vlm.js` then `reconcile.js` on those two slugs
specifically would overwrite good text with a worse transcription.
