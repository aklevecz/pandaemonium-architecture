# Lab Planning — Pandaemonium Architecture 6.0

Reference docs for designing the lab portion of the course. Written by the TA
while reading the syllabus and load-bearing course texts. **Not course-facing
material yet** — these are planning notes that feed into a future `/lab` page
on the site.

## Context

- Seminar: Scott Benzel. Lab: new TA (this is me).
- ATEK-639/439, Fall 2025, Mondays 1–3:50, A211H.
- Students are art students, not engineers. Syllabus: *"Conceptual skills and
  computer literacy are required. Advanced coding will not be necessary."*
- Syllabus: *"Tools, texts, and platforms are presented agnostically, the
  course will attempt to give context but use your judgement."*
- Syllabus: *"Readings are recommended but not required."* ← the lab frame has
  to stand on its own for students who haven't read.
- Grading: *"Grades are based on class and lab participation and the
  completion of a project, individual or collaborative."*

## What's here

| Path | What it's for |
| --- | --- |
| [`01-conceptual-frame.md`](./01-conceptual-frame.md) | Four operative terms the lab organizes around, each anchored in a specific course text. The theoretical spine. |
| [`02-lab-arc.md`](./02-lab-arc.md) | Week-by-week mapping: seminar topic → lab stance → paired text → what students make. Project milestones. |
| [`03-reading-digests.md`](./03-reading-digests.md) | Index of every reading digest + cross-cutting themes + recommended reading order for the TA. |
| [`04-open-questions.md`](./04-open-questions.md) | Design decisions that still need to be made before any of this becomes a page on the site. |
| [`readings/`](./readings/) | One digest file per assigned reading (~70 files). Each has a 2–4 sentence summary, 3–6 quote-anchored passages, a "why it's in the course" note, and its relevance to the four-stance lab frame. |

## Working principle

The lab is not skills training for art students. It's a sequence of *stances*
toward the apparatus of AI/ML. The tools (Colab, Cursor, Runway, Godot) are
occasions for the stances, not the point of the lab. The readings tell us
what the stances should be.

## Reading coverage

Every reading in the syllabus now has its own digest file in `readings/`.
Digests were produced by a mix of direct reads and subagent batches; all
use real line-cited quotes (no paraphrase or synthesis).

Known gaps and caveats — see `03-reading-digests.md` for the full list:
- `readings/week-12/additional-vogt-rituals-of-reversal.md` — the markdown
  file in the repo is corrupted (only repeating bibliographic citations);
  the R2 public dev URL returns 403 and the De Gruyter journal page is
  paywalled. Vogt's text needs to be re-sourced elsewhere.
- Four readings in `readings/uncategorized/` — Malabou, Brusseau, Wei,
  and (per W1 blurb) Rombach — do not have explicit week assignments in
  the syllabus. My best-guess placements are in each digest; confirm
  with Scott.
- Zero HP Lovecraft's *The Gig Economy* is assigned but its author has
  a far-right online following. Flag for students.
