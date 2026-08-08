# Readings still to source

**One** reading assigned in the Fall 2026 syllabus still has no text in the app.
Everything else is present and working: 77 readings, all reachable in
production, all PDF links and figure images resolving.

Last checked: 2026-08-08.

---

## Cory Doctorow — *The Reverse Centaur's Guide to Life After AI*

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

## Done

| Reading | Week | Sourced |
| --- | --- | --- |
| Incogni Research, The Great Digital Fatigue | 2 | authored from the live article |
| Yancey Strickler, The Dark Forest Theory of the Internet | 2 | authored from the live article |
| Aaron French, The Mandela Effect and New Memory | 3 | supplied |
| Félix Guattari, Integrated World Capitalism and Molecular Revolution | 4 | author-hosted PDF |
| Vincent Le, Spirit in the Crypt: Negarestani vs Land | 7 | Cosmos & History, open access |
| Benjamin A. Olsho, Hollywood Stock Exchange forecasting accuracy | 9 | supplied |

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
add the entry to `src/lib/data/syllabus.ts`, and:

```bash
node scripts/embed-readings.js     # so it's searchable
bash scripts/upload-data.sh        # push embeddings + summaries to R2
npm run deploy                     # uploads figures, builds, ships
```

`<slug>` matches on a unique prefix — `aaron-french` was enough.

Two things worth knowing:

- **`triage.js` rewrites every `metadata.json`.** That sounds alarming but it's
  deterministic — existing classifications have come back identical across
  three separate re-runs, verified by diff each time.
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

## Outstanding: summaries for six readings

The summary cards for the six readings above are missing — the Anthropic API
key ran out of credits mid-run. The same key serves the in-reader chat
assistant and the define popover, so those are down in production until it's
topped up. After refilling:

```bash
node scripts/summarize-readings.js   # cached; only fills the gaps
node scripts/people/extract.js       # then scripts/people/build.js
bash scripts/upload-data.sh
```
