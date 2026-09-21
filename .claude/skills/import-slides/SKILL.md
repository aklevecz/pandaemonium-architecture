---
name: import-slides
description: Turn a Google Slides deck into a lab deck for the course site (src/lib/data/lab-decks/lab-NN.md), or re-import one that changed. Use when Ariel shares a Google Slides link or a .pptx for a lab, says "import the slides", "parse my deck", "update lab N from the slides", or asks what changed in the slides since the last import.
---

# Import a Google Slides deck into a lab deck

Ariel specs lab presentations in Google Slides. The site renders lab decks from
markdown, one file per lab, in the format described in
`src/lib/data/lab-decks/README.md` (read it first if you have not this session).
Slides is the spec; the markdown is the product. Speaker notes become teaching
notes, which students never see.

Usage: `/import-slides lab-03 <share link or path to .pptx>`

## 1. Extract

```bash
python3 scripts/import-slides.py "<link or file>" --name lab-03
```

This writes `work/slides/lab-03/deck.json` and `work/slides/lab-03/media/`, and
prints one line per slide with a suggested kind. A share link only works when
the deck is set to "anyone with the link can view". If the script says Google
returned a web page, ask Ariel to change sharing or to use File > Download >
Microsoft PowerPoint. Do not ask for a Google login and do not try the Slides API.

If `lab-planning/slides/lab-03.deck.json` exists, this is a re-import. Go to
section 5 instead of overwriting the deck.

## 2. Decide each slide's kind

Read `deck.json`. `suggested_kind` is a guess from layout and word counts;
overrule it whenever the slide reads otherwise. The kinds, and what in Slides
points to each:

| Kind | Signals in the slide |
|---|---|
| `@title` | The first slide. Title becomes `# Title`, subtitle the paragraph under it. Keep the existing `eyebrow:` line (lab number, date, week title). |
| `@statement` | One or two sentences, no title, usually large type (`max_font` 30 or more). `note:` takes a small second line if there is one. |
| `@prose` | A title and sentences. One paragraph per blank line. |
| `@list` | A title and bullets. Numbered (`bullet: number`) stays numbered; otherwise dashes. Fold sub-bullets (`level` 1+) into their parent item, since the format has no nesting. |
| `@demo` | A link to something to open. Body bullets become the numbered steps. For a link with `site_path`, use the path (`/denoise`), not the full URL. Carry `?lab=N&slide=M` only if the existing deck's demos do. |
| `@quote` | Quoted text plus an attribution line. The source line starts with an em dash: `— Name, Work`. |
| `@image` | A picture is the point (`area` 0.4 or more, little text). Text on the slide becomes `caption:`. |
| `@video` | A clip. A YouTube or external video link is a `@demo` with that link instead; `@video` is only for a file in `static/`. |
| `@prompt` | What students make. A title like "Your turn", "Make", "Assignment", or a slide that ends the deck with instructions. `deliverable:` takes the hand-in line. |

Other rules:
- Skip slides marked `hidden` unless Ariel says otherwise, and say which you skipped.
- A table has no slide kind. Turn it into a `@list` or `@prose`, or ask if it is large.
- A slide that mixes a picture and a full argument becomes two slides, image first.
- An empty or title-only slide is a section break: make it a `@statement`.
- Never invent content. If a slide is a stub ("TODO", "demo here"), keep it as a short slide and list it under "needs your attention" in the summary.

## 3. Write the deck

Edit `src/lib/data/lab-decks/lab-NN.md`.

- Keep the existing front matter (`number`, `title`, `stance`, `blurb`) unless the deck clearly renames the lab. Keep `draft: true`. Publishing is a separate decision Ariel makes; never remove `draft` as part of an import.
- Course prose rules: plain, non-interpretive register. No em dashes (the quote source line is the one exception). Say what a thing is and what to do with it. Do not add claims, framing or transitions that are not on the slide. Tighten wording only where a slide would not fit on a projector.
- Fix obvious typos silently. Keep Ariel's phrasing otherwise, including jokes and blanks like "I wish I had invested in ______".
- Images: copy only the ones you use from `work/slides/lab-NN/media/` to `static/lab/lab-NN/` with descriptive names (`lora-loss-curve.png`). Downscale anything wider than 1920px with `magick in.png -resize 1920x out.png`. Write real alt text: what the picture shows, not "image".
- Speaker notes: write them to `lab-planning/lab-NN-notes.md` under a heading per slide, in slide order. If that file already has notes, merge under the matching slide and do not delete what is there.
- Readings named on a slide should match `src/lib/data/syllabus.ts` spelling.

## 4. Check, then show

```bash
node scripts/check-lab-deck.mjs lab-NN
node --test scripts/test-*.mjs
```

Open `/lab/N` in the dev server and step through every slide at projector size.
Look for text that overflows, a demo button that goes nowhere, and images that
fail to load. Drafts are visible in dev.

Then save the snapshot so the next import can diff against it:

```bash
cp work/slides/lab-NN/deck.json lab-planning/slides/lab-NN.deck.json
```

Report to Ariel: a table of slide number, title and the kind you chose, with
any guess you were unsure about marked; slides skipped; anything that needs
their attention. Do not commit or deploy unless asked.

## 5. Re-import (the deck changed)

```bash
python3 scripts/import-slides.py "<link or file>" --name lab-NN \
  --against lab-planning/slides/lab-NN.deck.json
```

The output lists only the slides whose words, links, pictures or notes changed.
The markdown may have been edited since the last import, so never regenerate the
whole file. For each changed slide, show Ariel the old and new text, apply the
ones they approve to the matching slide in the markdown, and leave every other
slide alone. New slides go in at the position they hold in Slides.

If slides were added, removed or reordered, slide numbers shifted. For Lab 01
the Nekhen links and the Experiences menu carry slide numbers
(`src/lib/experience-links.ts`, `?s=` and `?slide=` parameters in demo links),
so check those and tell Ariel what moved.

Update the snapshot only after the changes are applied.
