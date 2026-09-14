# Lab 01 and the first reading

**Reading:** Marek Poliks and Roberto Alonso Trillo, "0-Degree Plane of Neuroelectronic Continuity: AI and Psychosocial Evaporation," in *Choreomata: Performance and Performativity after AI* (Routledge, 2023), pp. 5–46.

**Lab:** Lab 01, "What's in the box?" Monty Hall, sampling, autoregressive models, latent diffusion.

Every quote below was checked against the text in `static/reading-content/`. Where a connection to the lab is my reading rather than the authors' claim, it says so.

**Syllabus check.** The Sep 13 PDF, "Pandaemonium Architecture 7.0 syllabus Fall 2026.pdf", is the newest version. Week 1 matches the site: this is the main reading, with Vaswani et al., Jacques and Selfridge as additional readings. The PDF's internal header still says "6.0", as the site does.

---

## 1. The reading in brief

**Thesis.** Generative AI "calls forth little substance in terms of social reorganization." It did not change society. It grew out of a society that had already turned people, culture and attention into data. The authors call that condition "vapor space," and say it existed "prior to AI in every sense, functioning as the latter's socioeconomic preconditions, its technical substrate."

**Glossary.** The chapter opens with physical terms that it uses throughout:

- **Vapor:** "a visible or invisible, uncontainable, uniform haze, mist, or cloud."
- **Diffuse:** "to exteriorize, disassemble, distill, or deform."
- **Evaporate:** "the metaprocess of diffusion."
- **Disperse:** "to fill, to tend toward uniformity within a volume, spread, and expand out."
- **Vapor space:** "the free interplay of fully autonomous processes cleaved from a subjective experience."

**Structure.**

| Section | What it does | Use in lab |
|---|---|---|
| 1. Postmodern Subject Mechanics (1a–1c) | Three models of the self: Newtonian, networked, "shadow." Postmodernity "consists in datafication." | Summarize. Keep the "dividual." |
| Section 2 opening | AI as an expression of vapor space; the hubris passage | Read aloud |
| 2a. Vapor Capital | Srnicek's convergence thesis: platforms and AIs grow alike | One sentence |
| 2b. Natural Language Models | Embeddings, positional encoding, autoregression; three ideologies of "narrow AI" | Use |
| 2c. Position and Autoregression | Tokens as indexes; the autoregressive machine | Read aloud |
| 2d. Vapor Aesthetics | Memes, "generation" as reconsumption, Loab, "cloud-reading" | Use |
| 2e. Hyperdimensional All-Human Orgy | Training data as a "genetic centrifuge"; bias; "new fascisms" | Use the bias part only |
| 3. Postscript on Heaven | The subject "as it limits to zero"; "Exit experience." | Leave to seminar |

---

## 2. Where the reading meets the lab, in deck order

### Life, Loops, Voices: rules you can read

The deck opens by contrasting systems whose rules are on screen with models that have "no rule you can read."

- **Reading (2b):** The authors name "Turing Orthodoxy," the dogma that "every problem can be solved through Turing machines."
- **My connection:** Life is a Turing machine you can read in three sentences. A language model is also computation, but its rule was fitted to data rather than written. Ask whether an unreadable rule is still a rule in the sense Turing Orthodoxy means.

### Monty Hall: the host knows

- **Reading (2c):** In vapor space, "content within indexed space is already preinscribed with instruction."
- **My connection:** The host's knowledge and rules are fixed before the player chooses. The player's decision is a probability game inside a structure someone else set. That is also the deck's last question, "Who set the sampler, and to what?"
- **Bayes, for teaching:** The prior is 1/3 per door. The host opening a door is evidence, and not random evidence, because the host never reveals the truck. The posterior is 1/3 for staying and 2/3 for switching.

### Gaussian sampling and Monte Carlo

- **Reading (2b):** "New Empiricism" is "a Silicon Valley epistemology through which data itself, simply by virtue of sufficient quantity, is a generator of meaning."
- **The deck already answers it:** "More trials reduce random error. They do not fix incorrect rules or a poorly chosen distribution." Put the two side by side: the deck's slide is a direct rebuttal of New Empiricism.

### From numbers to tokens, and temperature

- **Reading (2b):** Embeddings "correlate content similarity with proximity." An embedding "defines difference and meaning not as a function of content but as a function of volume of content."
- **Reading (1a):** Via Deleuze, the individual becomes a "dividual," made of "samples, data, markets, or 'banks.'"
- **My connection:** A token is a dividual. A word enters the model as an integer, then as a vector, and its meaning is its position among other vectors.

### Autoregressive: sampling a sequence

This is section 2c, and it maps closely onto the deck's slide.

| The reading (2c) | The deck |
|---|---|
| "a process that ingests content and outputs a next step" | "samples a token, appends it to the input, and samples the next token" |
| "For strictly autoregressive entities, there exists no element of memory" | "It does not revise" |
| When it "reaches a terminating character, it dies absolutely" | The stop token |
| A sequence "emerges" only "when an external observer catalogs the movements" | The output hides the alternatives it could have drawn |

**Push back here.** "No element of memory" is not accurate for a transformer, which reads its whole context window. The deck's Attention slide says as much: "the neighbourhood is the whole context window."

### Attention (Vaswani et al.)

- **Reading (2b):** The authors cite the paper (footnote 95) and describe transformers as deriving context "from the encoding of its sequence position vis-à-vis all other elements."
- **Their key sentence:** "The content itself is subordinated to location." Meaning becomes "a relationship between spatial (embedding) and temporal (positional) functions."
- **Reading (2c):** A token has no link to its meaning beyond "the most arbitrary mechanics (e.g., alphabetical order or hash value)." Their example: "A poem can be mapped into a relation with a car through proximity among one or many embeddings."
- **On /denoise:** The text-encoding section hashes words to ids, which is literally the "hash value" case.

### Selfridge, 1958

- **Reading (2b):** "Hard Naturalism" asserts that "sheer brute recursive processes can tend toward artificial intelligence."
- **My connection:** Selfridge proposes exactly that kind of process. His demons improve by hill-climbing and by "natural selection on the processing demons": weak subdemons are removed and new ones bred by "mutated fission" and "conjugation."
- **A second link:** Selfridge writes that a pattern can only be defined by "the consensus of the people who are using it." That is the training-data argument, in 1958.

### Latent diffusion and the Denoise board

- **Glossary, as my analogy (not the authors'):** "Disperse: to tend toward uniformity within a volume" describes the forward process, adding noise until the image is uniform static. The authors never discuss how diffusion models work; their image-model material is Loab, the Stable Diffusion lawsuit and the bias study.
- **Reading (2c):** "There is nothing in vapor space that is new."
- **On /denoise:** At maximum noise the estimate becomes the average of the ten training images, and generation can only return one of those ten. That supports the authors. A real model interpolates between training examples, which argues against them. Let the class decide.
- **Reading (2d):** "The near future of human creative practice may involve little more than cloud-reading, storytelling about patterns in the mist." They also name the aesthetic "compulsive apophenia."
- **In the room:** Run the burger clip or the Denoise slides and ask at which step each student first thought they could see what it would become.

### What is set before the prompt, and the four questions

This is where the section 2 opening belongs.

- **Reading:** Vapor space "automatically, unthinkingly enacts AI. It scopes AI, it limits AI, it holds and hosts AI, it expresses itself as AI – not as a revolutionary object but simply as a natural and neutral automatic predisposition."
- **The deck:** "The statistics of the training set fill in the result," and "A prompt conditions the sampling. It does not override the training data or the sampler settings."

### Closing quote (McQuillan)

- **Reading (2e):** Image models render an "attractive person" as white and exaggerate occupational gender imbalance (the Bianchi et al. study). An AI "becomes a generative engine of new racist logics," and bias grows "increasingly unanalyzable," built from "microdecisions at the level of quanta."
- **Pair it with the pizza experiment (section 4):** The authors say bias is unanalyzable from inside the model. Sampling a thousand times and counting is a way to measure it from outside.

---

## 3. The hubris passage

> "What incredible hubris it is to assume that the apotheosis of modern computation would assume a form resembling human consciousness, as opposed to sharing the mechanistic visage of capital."

- **"Apotheosis of modern computation"** means the peak of computing, and the word literally means becoming a god. It points at AGI talk.
- **The hubris** is assuming the end point would look like us. Boosters and doomers share it: a friendly assistant and a Skynet are both pictured as minds.
- **"The mechanistic visage of capital"** is the authors' alternative. Capital runs without anyone steering it, optimizes, turns everything into exchangeable units, and is indifferent to what it processes. It has no inner life and does not need one.
- **Footnote 83** gives the source in one line: "No AGI under capitalism" (Srnicek and Negarestani).
- **The next sentence:** "What hubris it is to position AI as the inheritor of subjectivity as opposed to an indifferent, local expression of the subject's gradual diffusion and destruction."
- **The postscript finishes the thought:** "AI tends toward human subjectivity and consciousness insofar as human subjectivity and consciousness tend toward the contingent, random frenzy of Turing machines transforming states into next-states." The resemblance is real, but it comes from people becoming more machine-like, not machines becoming human.

**Lab examples (mine):**

- **Next-token prediction** is a scoring procedure over the whole vocabulary, nearer to a market than a mind. The human voice of a chatbot comes from training and from a product decision to present it as a conversation partner.
- **The denoiser** was only trained to remove noise, yet the burger looks deliberate.
- **The default pizza** looks like commercial food photography because that is what circulates most.

**Where students can push back:**

- The claim is asserted, not argued.
- Chatbots are deliberately made to seem human. Does that weaken the claim, or support it?
- In 2a the authors say capital itself is evaporating, so "the visage of capital" is a moving target.

---

## 4. The pizza experiment: the reading's claim, measured

Page: <https://atek639.calarts.app/pizza>. Scripts: `scripts/pizza-distribution.mjs`, `scripts/pizza-thumbs.sh`.

**Method.**

1. `gemini-3.1-flash-image` generated 1000 images from one unchanging prompt.
2. `gemini-3.8-flash` labeled each image against a fixed list of options.
3. The page counts the labels and compares them with a random pick from the same list.

**Prompt changes the spread, not the defaults.**

| | "pizza" | "a slice of pizza" |
|---|---|---|
| Distinct label combinations | 25 | 50 |
| Most common exact image | 71% | 16% |
| Photograph | 100% | 100% |
| Three-quarter view | 99.5% | 100% |
| Wooden board | 96.5% | 55% |
| People visible | 95.5% | 91% |
| Whole pizza | 100% | 21% (despite asking for a slice) |

**Toppings, against a random pick of 1 in 6 (about 167 per 1000).**

| | cheese only | pepperoni | vegetable | mixed meat | seafood | other | entropy |
|---|---|---|---|---|---|---|---|
| "pizza" | 45 | 897 | 46 | 1 | 0 | 11 | 0.63 of 2.58 bits |
| "a slice of pizza" | 0 | 994 | 0 | 2 | 0 | 4 | 0.06 of 2.58 bits |

**How it connects to the reading:**

- **Convergence and dedifferentiation (2a, 2b):** One word produced essentially one picture.
- **"A prompt names a distribution":** The prompt picks a region; the training data decides its shape. Asking for "a slice" made the shape more varied on form and setting and narrower on toppings.
- **Prior versus prompt:** One in five "slice" images was still a whole pizza.
- **Bias measured from outside (2e):** Counting samples finds the defaults without looking inside the model.

**No prompt at all.** The same image model was sent an empty prompt 1000 times (993 returned an image). Results are under "no prompt" on the page.

**First pass.** A general "subject" label put 93% of images under "person" and 98% under "photograph." That was true but said nothing about what the people were doing.

**Second pass, by scene.** Eighty sample images were described in a sentence each and grouped into 15 scene types. All 993 were then relabeled by scene, group size, ages, mood, setting, region (guessed from visible cues only) and style.

| Scene | Share |
|---|---|
| Sport or fitness | 17% |
| Park or garden | 13% |
| City street | 9% |
| Home or family | 8% |
| Festival or performance | 8% |
| Study or campus | 7% |
| Other | 7% |
| Hiking or mountains | 6% |
| Craft or workshop | 6% |
| Market or shop | 5% |
| Café, bar or restaurant | 5% |
| Museum, landmark or travel | 4% |
| Farm or rural work | 2% |
| Office work | 2% |
| Nature with no people | 1% |

The activities are varied: scene entropy is 3.65 of a possible 3.91 bits. The tone is not.

| | Result | At random |
|---|---|---|
| Joyful mood | 72% | 20% |
| Sad or tense | 12 images (1%) | 20% |
| Photograph | 98% | 20% |
| People in the image | 97% | |
| Children as the main people | 3% | 1 in 6 |
| North America or Europe, where region was readable | 75% (547 of 733) | 2 of 9 |
| Distinct label combinations | 622 | |

The first three images were a woman in a rainy New York bodega, four students at UC Berkeley, and older friends hugging at an autumn party. The most common exact combination (19 images) was a small group of joyful young adults on a European city street.

Asked for nothing in particular, the model does not draw one thing. It draws a genre: happy people doing wholesome activities, photographed mostly in daylight (76% in the first pass), mostly in North America and Europe. That is stock photography. This is the lab's clearest case of the deck's line "the statistics of the training set fill in the result," and of 2e's point that what looks like a neutral default carries a particular point of view.

**Caveat:** The region label is a model's guess from visible cues, and 26% of images were marked unclear. Treat it as a rough signal, not a census.

**Caveats to say aloud:**

- The labeler is also a model, working from a list someone wrote. Some uniformity could come from coarse categories. The image grid is there so you can check by eye.
- The results cover one image model, and the API exposes no seed.

---

## 5. Where the reading is loose (useful in class)

- **Dated translation example (2b):** Their account of translation, matching a word's vector in an English embedding to one in a French embedding, describes older word embeddings, not the transformer paper.
- **Garbled rule of thumb (2b):** "Dimensions ≈ 4√Z" misstates Google's rule, which is a fourth root.
- **Memory (2c):** "No element of memory" does not fit a transformer's context window.
- **Diffusion:** The authors do not discuss diffusion mechanics. The glossary link to noising is an analogy for teaching, not their argument.

**Exercise:** Read 2b next to the Attention paper and find where they differ.

---

## 6. Discussion questions

1. If the model's rule is fitted to data rather than written, is it still a rule in the sense of Life's three sentences?
2. In Monty Hall, what is the prior, what is the evidence, and why is the evidence not random? Where is the "host" in a language model?
3. The deck says more samples reveal a distribution without changing it. What does that say about "New Empiricism"?
4. The authors say an autoregressive machine "produces nothing." What does sampling add, if anything?
5. On /denoise, at what step did you first see the image? Was that the model deciding, or you "cloud-reading"?
6. "A slice of pizza" came back as a whole pizza 21% of the time. Is that the prior outweighing the prompt, or the labeler?
7. With no prompt, the model drew stock photos of people. Whose idea of "nothing in particular" is that?
8. Is a chatbot's human voice evidence against the hubris passage, or a product decision laid over "the mechanistic visage of capital"?

---

## 7. In the room

- **Read aloud:** the section 2 opening (the hubris quote), all of 2c, and the cloud-reading sentence from 2d.
- **Summarize:** section 1 in two sentences (datafication; the dividual) and 2a in one (convergence).
- **Leave to Scott:** 2e's reproductive framing and the Dante postscript.

## 8. Open items

- **Deck error:** `src/lib/data/lab-decks/lab-01.md` line 232 says "The set of demons is chosen by the designer before the system runs." Selfridge's paper says the opposite: subdemons are removed and new ones bred while it runs. Not yet fixed.
- **No-prompt run:** finished and added to section 4 and the page.
