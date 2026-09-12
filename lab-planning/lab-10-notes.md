# Lab 10 notes: What's the Deal with Birds?

Deck: `/lab/10`. The syllabus assigns no lab items for this week. These notes cover the technical and methodological concepts inside Scott's material, so there is something to work with if the room turns to the lab half.

---

## 0. What the seminar half is doing

Hoaxing as a practice, from the Yippies through the Yes Men to Birds Aren't Real; predatory journals; and Floridi's method of levels of abstraction alongside Deleuze and Guattari's abstract machines. The technical hooks are about how claims get certified, and how a description commits you to what you can see.

---

## 1. Levels of abstraction, as an actual method

Floridi's *The Method of Levels of Abstraction* (2008) is assigned, and it is a formal proposal rather than a metaphor, which is worth stating because students will read it as the latter.

A level of abstraction is a set of observables you commit to, each with a defined range of values. The claim is that a question is only well posed relative to a stated level, and that many disagreements are two parties working at different levels while believing they disagree about the object.

Worked example, using the course's own material: a diffusion model at the level of the interface has observables prompt, style, and seed. At the level of the sampler it has steps, scheduler, and guidance. At the level of the mathematics it has a noise schedule and a learned score function. All three descriptions are correct. "What does the model do" has three different true answers, and picking a level is a decision that is usually made for the user by the interface.

This is a genuinely useful tool for the whole course, and it is the most portable thing in this week's readings.

**The distinction from abstract machines.** Deleuze and Guattari's abstract machine is not a level of description; it is a diagram of forces that a concrete arrangement actualises. Floridi's levels are epistemological, chosen by an observer for a purpose. Do not let the two collapse into each other, since they answer different questions.

---

## 2. How a claim gets certified, and how that gets gamed

Birds Aren't Real and predatory journals are the same structure viewed from two sides: both exploit the fact that the apparatus which certifies a claim checks form, not content.

- **Predatory journals** accept papers for a fee with no meaningful review. The standard demonstrations are the SCIgen generated papers accepted by conferences from 2005 onward, and the several hundred SCIgen papers later found in the archives of established publishers. SCIgen is a context free grammar producing syntactically valid nonsense. The parallel to a language model is exact and unflattering to both: fluent, well formed, and about nothing.
- **The hoax as method.** The Yippies, the Yes Men and Birds Aren't Real each work by supplying an institution with something that satisfies its intake criteria. The critique lands only because the institution processes the object normally.

The connection to the course, stated plainly and left as a question: automated text generation makes the cost of producing form-valid, content-empty material fall to nearly zero, on both sides. That is a claim about volume, which is the only kind of claim the technology supports on its own.

---

## 3. If a lab half gets added

Two directions that would fit and would be buildable:

- **A detection exercise.** Give the room a mixed set of real abstracts and generated ones and have them sort it, then discuss what cues they used and which of those cues will survive another year.
- **A levels of abstraction exercise.** Take one system the class has used, describe it at three levels, and identify which level each interface makes available. This is a direct extension of Lab 01's four questions.

---

## 4. References

- Floridi, *The Method of Levels of Abstraction*, 2008. Assigned.
- Zepke, introduction to *Art as Abstract Machine*, assigned.
- Baldassarre, *What's the Deal with Birds?*, assigned.
- The SCIgen project, MIT, 2005, and Labbé's later surveys of generated papers in the literature.
