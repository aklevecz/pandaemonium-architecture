# Lab Arc — Week by Week

The existing one-line lab descriptions in `src/lib/data/syllabus.ts` are a
tools list. This doc proposes a stance for each week's lab and what a
student might make. The tools stay in — they're fine as occasions — but they
are now subordinate to the stance.

The four stances from [`01-conceptual-frame.md`](./01-conceptual-frame.md)
cycle through the semester rather than blocking off into phases. Each week
foregrounds one stance while the others remain available.

## Proposed arc

| Wk | Seminar title | Current lab blurb | Proposed lab stance | What a student might make |
|----|---------------|-------------------|---------------------|---------------------------|
| 1 | A grin without a cat | Generative/toy AI: Golly, Wotja, latent diffusion, transformers | **Apparatus.** Play with small, "honest" systems (Conway's Life, Wotja, Golly) where the cuts are visible — then open a commercial model and try to find the same cuts, now invisible. | A two-panel piece: one output from a visible-rule system, one from a commercial model, and a short written naming of what was decided before they arrived. |
| 2 | Shoggoth w/ Smiley | Colab/Python, Hugging Face, GitHub | **Apparatus** (continued). Infrastructure as the apparatus behind the apparatus. What does Hugging Face decide counts as a "model card"? What does GitHub decide counts as a "repository"? | An annotated capture of one model card + one repo README, with the cuts named. |
| 3 | Degrade the Threads | LLMs: local LLMs, ChatGPT, coding with LLMs | **Loading.** The LLM as Llull's wheel. Students assemble a corpus (poems, texts, refusals, their own writing) and fine-tune/prompt-load it into a model. Output reflects what was loaded, not the model's "voice." | A short written piece (300–500 words) whose character came from the corpus, not the model's defaults. Corpus is turned in alongside. |
| 4 | Pervasive Global Cognitive Automaton | Copilot, Cursor, encapsulation | **Loading** (continued). Coding-with-LLMs as loading. The student commissions code for an intentionally unuseful or un-marketable purpose. "Encapsulation" reframed: what do you wrap around the apparatus so that its output is channeled somewhere weird? | A small runnable artifact (web page, script, CLI toy) that does something the tool doesn't want to do. |
| 5 | Young Slime Life | Particle systems, Unreal Engine | **Apparatus** (swarm edition). Particle systems are a good site for the Barad move because the "particles" are already boundary-decisions. Readings pair: Barad is this week. | A particle piece whose write-up names what the simulator decided counts as a particle, a neighbor, a force. |
| 6 | Young-Grrrl War-Machine | Game engines, Godot Engine | **Reversal.** Godot used for un-gamelike ends (per Nguyen: separate goal from purpose; make the goal ornamental or refused). Cyberfeminism Index as a catalog of prior reversals to reference. | A "game" that refuses to be a game: no win state, or a win state the player can't reach, or a system designed to dissuade play. |
| 7 | Eliminative Materialism | Generative AI imagemaking, photobashing | **Reversal** (Schüll week). Reading pair: *Addiction by Design*. The week the captology argument lands. Students make generative images that resist time-on-device — images that reward looking *once*, slowly, and then being left alone. | A single image (not a set) with a one-paragraph spec of what it refuses (scroll, grid, series, cropping, looping). |
| 8 | Art as Abstract Machine | Runway, Sora, generative video | **Reversal / Loading together.** Reading pair: Zepke. Generative video used against its optimizations (fluency, motion, legibility). Slowness, stillness, duration, repetition. | A short video (≤60s) whose design deliberately violates what Runway/Sora are optimized for. |
| 9 | Hopeium | Generative sound, sonification, *AI without prompts* | **Loading / Opacity.** Reading pair: Diederichsen. The "AI without prompts" phrase in the current blurb is gold — it's already the Borges move. Sound has less punch-line pressure than image, so this is a good week for work that cannot be reduced to a prompt. | A sound piece plus a written refusal of the "what's it about" question. Diederichsen's *Mehrwert* critique is the prompt. |
| 10 | Metaruins | Work on your project | **Creative Act.** First spectator milestone. Student shows work-in-progress to one person outside the cohort and logs what that person completed. | Notes on the spectator encounter; project adjusted in response. |
| 11 | Lulzsec to Nulzsec | Work on your project | **Reversal / Opacity** (Brunton & Nissenbaum week). Reading pair: *Obfuscation*. Students apply one obfuscation tactic from the book (chaff, TrackMeNot, group identity, false tells, identical confederates) to their own project. | A proposed obfuscation-move their final project will enact. |
| 12 | Asymmetrical Likewar | Work on project / present | **Creative Act.** Second spectator milestone. Dress rehearsal in front of cohort. | Full dry-run of final presentation. |
| 13 | Parasites Lost | Present your project | **Creative Act** (final). | Final project + reversal statement (see below). |

## Project framework

Syllabus: *"completion of a project, individual or collaborative."* Singular.
Medium-agnostic.

**Seed — Week 4.** Each student (or team) picks one apparatus they will bind
themselves to for the rest of the semester. They submit a one-page artifact:
(a) name the apparatus, (b) name the cuts it already made, (c) name one
thing they want to load that the apparatus was not designed for, (d) name
the native use they intend to invert.

**Prototype — Week 8.** Working draft of the piece. Must fail the
*punch-line test*: the work cannot be compressed into a single sentence
that captures its "idea." If it can, it's not done. (Diederichsen framing —
the lab is making art that cannot be reduced to *Mehrwert*, the single
crucial maneuver.)

**First spectator — Week 11.** Show the prototype to one non-cohort viewer.
Bring notes on what the viewer completed (Duchamp's art coefficient, made
concrete). If the spectator completed nothing, the piece isn't finished yet
— not because it's bad, but because the second pole of the creative act
hasn't been reached.

**Public — Week 13.** Final presentation in class. Submitted with a
**reversal statement**: a 1–2 paragraph text that names
- what the apparatus was built for (fluency, engagement, capture,
  prediction — whatever it is),
- what this piece made it do instead,
- what the spectator completed when they encountered the piece.

## Grading sketch (if needed)

Participation (per the syllabus): showing up to lab, engaging with the
weekly stance, critiquing peers.

Project evaluated on the reversal statement's three points, not on
technical polish or medium fluency. An "ugly" piece with a strong inversion
is better than a beautiful piece with none. This needs Scott's sign-off
before I commit to it.

## Medium-agnostic note

The project is not required to use the tools of the lab. A student whose
best reversal move is a zine, a performance, a rumor (per Benzel's
*Polybius* note — art-as-vaporware is an option), or an email list is doing
the work. The apparatus they bind themselves to does not have to be an AI
tool; it can be any of the apparatuses the course studies (Facebook's
captology, Palantir-style prediction, HFT, gacha, walled gardens, etc.) as
long as the four moves apply.

## What changes on the site

- `/lab` — a new top-level page with the conceptual frame (the four stances,
  short) and the project framework.
- `/week/[num]` — the existing `lab:` string stays, but gets augmented by a
  *stance* field and a *pair* field pointing at the paired reading. Data
  lives in `src/lib/data/syllabus.ts` so the change is small.
- Optional: per-week lab detail pages. Probably not worth building until
  after the first time through the course, when I know what the weeks
  actually need.

See [`04-open-questions.md`](./04-open-questions.md) for decisions still
outstanding.
