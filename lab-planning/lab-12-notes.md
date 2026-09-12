# Lab 12 notes: Rewiring Social Structure / Parasites Lost

Deck: `/lab/12`. Lab item: present your project. Final session.

---

## 0. What this session is for

The lab half is presentations. These notes are a running order and a set of questions, not new material. Any remaining technical content should come out in response to what students actually built.

---

## 1. Running order

- Reserve the full lab block. Presentations always run long, and cutting the last person is the worst possible ending to a course.
- Ten minutes each with two for questions, or adjust to the count and announce the number at the start so nobody plans for more.
- Same projector rule as Lab 11: test it before, and have a recording of the working state.
- Go in an order you set, not volunteers. Volunteering sorts by confidence.

---

## 2. Questions to ask each project

The four from Lab 01 still work as a spine, and by now the room recognises them:

1. What counts as a state in this system?
2. What counts as a neighbour, meaning what is allowed to influence what?
3. Where did the rule come from: written by a person, or fitted to a corpus someone chose?
4. Who set the sampler, and to what?

Three more that suit a final session:

5. What did you try to find out about your tools and fail to find out? What would have to be published for you to know it?
6. What did you decide yourself, and what did you accept as a default?
7. Run it twice. What changed, and what does that tell you about where the randomness lives?

Question five is the one to insist on. Over twelve weeks the course has repeatedly hit the same wall, which is that the training data, the sampler settings and the objective are usually undisclosed. Naming the specific thing you could not learn is a real result, not a failure to research.

---

## 3. The technical arc, for a closing summary if you want one

Stated as a sequence, without interpretation:

- **Lab 01.** A model outputs a distribution. A separate step draws from it. The draw is not in the weights.
- **Labs 02 and 05.** Around every model is a harness, a prompt, and a retrieval step, all of which are text somebody wrote.
- **Labs 03 and 04.** The weights were fitted by making one chosen number smaller, and small cheap adjustments can redirect that fit.
- **Labs 06 and 07.** The representations underneath, tokens and embeddings, are fitted to a corpus, and the failure modes visible at the top follow from decisions made at the bottom.
- **Lab 08.** Speed and quality are traded against diversity, by methods the interface does not name.

The one sentence version, if you want it on a final slide: at every level there was a choice, most of the choices were made before you arrived, and almost none of them are disclosed.

---

## 4. Housekeeping

- Confirm whether anything is due after this session and where it goes.
- The lab decks and the demo pages stay up. Say so, and say where the repository is, since some students will want to reuse the code.
