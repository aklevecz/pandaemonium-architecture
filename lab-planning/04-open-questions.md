# Open Questions

Things that need to be decided (by me, or with Scott) before any of this
gets turned into a site page. Listed roughly in decreasing order of how
much they block the work.

## Scope & audience

**1. Is `/lab` a single page or a section?**

Options:
- (a) One page. Conceptual frame + project framework + a table of weekly
  stances. Done.
- (b) A section with a landing page + per-week lab detail pages that
  expand the current one-liner on `/week/[num]`.

Current lean: (a) for v1, with the option to promote to (b) after I've
taught the course once and know what the weeks actually need. (b) risks
over-engineering content that may not get read.

**2. Who is this page for?**

- Enrolled students (primary).
- Prospective students (at a minimum, they browse `/` and read the
  syllabus).
- External / public (the syllabus is already public).

Current lean: primary enrolled, but write so the public can read it.
Avoid insider jokes and shorthand. The course's politics are already
visible on the homepage, so this page doesn't need to hide.

**3. Do I want the page to presuppose the readings?**

Syllabus says no. The four-stance frame was built to work standalone.
Confirming: page should be readable by a student who opens it on Day 1
having read nothing. Quotes can be blockquoted but should not carry the
load; the prose has to.

## Content

**4. Evaluation / grading.**

The syllabus only says "grades are based on class and lab participation
and the completion of a project." I've proposed in `02-lab-arc.md` that
the project be evaluated on a *reversal statement* with three points.
This needs Scott's sign-off — I do not want to propose a grading rubric
he hasn't agreed to.

**5. Per-week stances.**

I've drafted a week-by-week stance mapping in `02-lab-arc.md`. This is
the part most likely to be wrong — I'm drafting it from one read of the
syllabus, not from actually teaching it. Scott may want to swap weeks,
reassign stances, or drop the mapping entirely and let stances cycle
organically. Needs a pass with him.

**6. Medium policy.**

Is the final project free-medium (zine, performance, rumor, code, video,
sound, installation) or does it need to use the AI/ML tools the lab
covers? I've proposed free-medium with the constraint that the chosen
apparatus come from the course's apparatus-set. The syllabus is silent;
the course description mentions "artists employing machine learning,
generative algorithms, predictive models, and *other technics*," which
leans free-medium.

**7. Individual vs. collaborative default.**

Syllabus says "individual or collaborative" — but what's the default?
Does the lab page recommend one? Current lean: individual is default,
collaborative is a named option for projects that specifically need it
(e.g., a group-identity / "I am Spartacus" piece, which literally
requires a group).

## Infrastructure

**8. Where does this data live?**

Current `syllabus.ts` has `lab: string` on each week. If we add per-week
stances and paired readings, options:

- (a) Extend `Week` interface with `labStance`, `labPairing`, `labBlurb`.
  Minimal change.
- (b) New `Lab` interface in a new file (`labs.ts`), with 1-to-1 relation
  to `Week.number`. Cleaner separation but another file to maintain.

Current lean: (a). It's a small change, easy to revert, and keeps
everything for a week in one place.

**9. New route or extend existing?**

- New: `/lab` top-level route with `+page.svelte` mirroring the style of
  `/+page.svelte` (hero + sections + rule lines).
- Extend: add a `/lab` section to the existing `/+page.svelte` on the
  home page.

Current lean: new route, so `/` stays a focused course overview and
`/lab` can be detailed without crowding.

**10. Linkage from existing pages.**

- Home (`/+page.svelte`) needs a link to `/lab` somewhere — probably
  under the hero, before the syllabus.
- Each `/week/[num]` page could have a "Lab stance: X — see /lab#stances"
  micro-link.

## Process

**11. Should I share these docs with Scott before touching the site?**

Yes. These are planning notes, not course material. The four-stance
frame is defensible from the readings but I want Scott to either bless
it, replace it, or adjust it before I build a public page on top of it.

**12. What order to build in?**

Proposed sequence, assuming the frame lands:

1. Review with Scott. Revise if needed.
2. Extend `Week` type with `labStance` + `labPairing` in
   `src/lib/data/syllabus.ts`. Update per-week data.
3. Lightly augment `/week/[num]` lab section to show the stance and
   pairing. Small visual change.
4. Build `/lab` page with the four stances + project framework.
5. Link it from the homepage.
6. (Optional, post-semester) per-week lab detail pages.

**13. Readings I still should read before building.**

Top three from `03-reading-digests.md`:
1. McQuillan, *Resisting AI* (intro reading — anchors the whole course).
2. Bratton, *Platform and Stack, Model and Machine* (W4 — apparatus at
   planetary scale).
3. Hoffman, *Interface Theory of Perception* (W10 — may sharpen the
   apparatus move).

These can be done before the `/lab` page is drafted. Not blocking the
planning docs but blocking the final text on the page.

## Things I suspect but want to verify with Scott

- That "obfuscation" (Brunton & Nissenbaum, W11) is indeed the strongest
  available aesthetic vocabulary for the course. I'm making it
  load-bearing in the reversal move. If Scott reads the course as having
  a different center of gravity, this changes.
- That Duchamp's *Creative Act* is the course's foundational theory of
  art-making. Week 1 plus Benzel's own writing on it both say yes, but
  I want the confirmation before it structures every milestone.
- That the *Mehrwert* / punch-line critique (Diederichsen) is the right
  test for "is this done." It's a strong claim and a demanding standard
  for student work.

## Non-questions (decided)

- Eric Kaplin's prior lab design does not constrain this. He's past TA.
- Readings are not required for students, so the lab page must stand
  alone — already baked into the four-stance frame.
- Tools are agnostic, so no week's lab prescribes a specific product.
- The lab is not engineering training — already baked into the four-
  stance frame.
