# Lab 06 notes: Post truth psychosis

Deck: `/lab/6`. Lab items: hallucinations and repetition, doing research with AI. Visitor to be announced.

---

## 0. The frame in one paragraph

A language model is a distribution over next tokens. There is no place in it where a claim is checked against the world, because there is no world in it, only text. Fluent and false is not a malfunction of the system; it is the ordinary output of a system optimised for fluency and never for truth. Repetition is the same story from the other end: the mechanics of sampling can lock the model into a loop, and the loop was measured and fixed by changing the sampler, not the model. Both facts are old, both are understood, and neither is going away.

---

## 1. Where hallucination comes from

Four contributing causes, worth separating because they have different fixes:

**1. The objective.** Training rewards putting probability on plausible continuations of text. A plausible continuation of "the paper was published in" is a year, and a plausible continuation of "written by" is a name. Nothing scores whether the year or the name is right. The model learned the shape of a citation, which is exactly what it was asked to learn.

**2. Compression.** Training data is enormously larger than the weights. Facts seen once are not reliably stored; what survives is the pattern. When the specific fact is not there, the pattern fills in. This is why hallucinations are most common on obscure specifics and rarest on things repeated a million times.

**3. Sampling.** From Lab 01: the output is a draw. Even when the correct token is the most likely one, at nonzero temperature the model sometimes draws another. Then autoregression takes over, because the wrong token is now in the context and everything after it is conditioned on it. One unlucky draw commits the model to defending it.

**4. Evaluation pressure.** This is the newer argument, made directly by OpenAI researchers in 2025: benchmarks and training regimes score answers as right or wrong and rarely reward "I do not know". Under that scoring, guessing beats abstaining, exactly as it does on a multiple choice exam with no penalty for wrong answers. The models are calibrated to a test that punishes uncertainty.

The useful summary sentence for the room: the model is not lying, and it is not confused. It is completing a pattern, and there was never a step where it could have checked.

### What reduces it, and by how much

- **Retrieval** (Lab 05), putting real source text in the prompt. Substantial reduction, not elimination. The model can still misread or over-summarise the passage.
- **Web grounding with citations.** Same, plus the user can check. Note that a citation being real does not mean it supports the sentence attached to it.
- **Asking for uncertainty.** Helps somewhat, and models are poorly calibrated about their own calibration.
- **Lower temperature.** Reduces unlucky draws, does not fix wrong knowledge.

None of these is a truth predicate. There is no truth predicate.

---

## 2. Repetition and degeneration

This one has a clean, teachable history, and it connects straight back to Lab 01's sampler.

Holtzman et al., 2020, *The Curious Case of Neural Text Degeneration*, made the observation: if you decode by always taking the most likely token, or by beam search, the model falls into loops, repeating a phrase indefinitely. Not sometimes, reliably.

**Why.** Each repetition of a phrase increases the probability the model assigns to repeating it again. It is a positive feedback loop inside the context: the pattern in the prompt is now "this phrase keeps appearing", and the best completion of that pattern is the phrase again. Attention (Lab 01) is what makes this possible, because every position sees every previous one.

**The other half of that paper's finding**, and the more interesting one: human text is not the most probable text. Measured token by token, real writing constantly picks moderately likely words, and its probability curve is jagged. Maximising likelihood produces something that reads as inhuman, because humans do not maximise likelihood. This is a real empirical result, and it is the best available argument for why sampling exists at all.

**The fixes**, all in the sampler, none in the model:

- Nucleus sampling (top-p), which the same paper introduced.
- Repetition and frequency penalties, which reduce the score of tokens already used.
- Higher temperature, at the cost of coherence.

Say the punchline: a whole visible failure mode of these systems was solved by changing five lines in the decoding loop, which nobody outside the pipeline sets or sees.

---

## 3. Doing research with a model, honestly

This should be practical, and it should include the failure cases with names.

### The citation problem

The canonical case is Mata versus Avianca, Southern District of New York, 2023: a lawyer filed a brief with six fabricated case citations produced by ChatGPT, complete with plausible reporter numbers and quotations, then confirmed them by asking the same model whether they were real. Sanctions followed. It is the ideal teaching example because the second step, verification inside the same system, is the mistake everyone makes.

Fabricated references are common precisely because the format of a citation is highly patterned and its content is arbitrary. The model is excellent at the format.

### A workflow that actually works

- **Use it to find, never to confirm.** Generating leads is a strength. Verifying them requires leaving.
- **Every citation gets opened.** Not searched for, opened. If it does not resolve to a document you can read, it does not exist.
- **Quotes get located in the source.** A real paper plus an invented quotation is the most dangerous output, because the reference checks out.
- **Ask for the reasoning, then check the reasoning**, not the conclusion. Wrong conclusions with correct steps are rare; correct conclusions with broken steps are common and worse.
- **Ask the same question in a fresh conversation.** Disagreement between runs is a signal (this is sampling again). Agreement is not evidence, since both runs share the same priors.
- **Watch for the confident register.** These models do not modulate tone by confidence. The sentence about a thing it knows well and the sentence it made up read identically. That is the single most important thing to teach.

### The research uses that are genuinely good

Summarising a document you have; translating jargon; naming a concept you can describe but cannot recall; generating counterarguments; explaining unfamiliar notation; drafting a search strategy. All of these have the property that you can check the output against something you already have.

---

## 4. The seminar connection, stated without editorialising

The week's frame is post truth. The technical material supports one specific claim, worth stating precisely: these systems produce text with no relationship to a verification procedure, at a volume no verification procedure can match. That is a fact about throughput and about architecture. What follows from it is the seminar's question, not the lab's.

---

## 5. Questions to expect

**"Will hallucination be fixed?"** Reduced, and it is being reduced. Eliminated would require a mechanism the architecture does not have. Retrieval and tool use move the problem rather than solving it.

**"Why does it apologise and then repeat the same wrong thing?"** The apology is also a completion. It does not have access to why it produced the earlier answer, and the wrong claim is still in the context conditioning everything after it.

**"Is it lying?"** Lying requires knowing the truth and intending to mislead. Neither is present. That is a stronger claim than it sounds, and it is worth defending carefully rather than sliding past it.

**"Can I detect AI text?"** Not reliably. Detectors have high false positive rates, especially on non native English writers, and multiple universities have withdrawn them for that reason.

---

## 6. References

- Holtzman, Buys, Du, Forbes and Choi, *The Curious Case of Neural Text Degeneration*, ICLR 2020.
- Kalai et al., *Why Language Models Hallucinate*, 2025, for the evaluation incentives argument.
- Ji et al., *Survey of Hallucination in Natural Language Generation*, 2023.
- *Mata v. Avianca*, S.D.N.Y., June 2023.
- Liu et al., *Lost in the Middle*, 2023.
