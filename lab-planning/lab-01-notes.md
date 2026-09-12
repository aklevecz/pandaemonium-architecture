# Lab 01 notes: What's in the box?

Ariel's half. Monty Hall, sampling, autoregressive models, latent diffusion. Written to go deeper than the slides when someone asks, and to review from.

Deck: `/lab/1`. Pages: `/life`, `/loops`, `/voices`, `/monty-hall`, `/denoise`.

---

## 0. The frame in one paragraph

Scott's half shows systems whose rules are written down: Conway's Life is three sentences, a Koan patch is a table. This half shows systems whose rules are fitted to data and cannot be read. The one tool that works on both is the same: run the system many times and look at the outputs. Every system in this half does one thing: it produces a probability distribution over possible outputs, and a separate step draws one. The model is the distribution. The draw is sampling. Most of what people call "the AI's decision" is the draw.

---

## 1. Handoff: Life, Loops, Voices

Slides 5 to 7. Scott ran Golly and Wotja; these are our own versions, so the room can touch them.

### Life (`/life`)

The rule, complete: a live cell with two or three live neighbours stays alive; a dead cell with exactly three becomes alive; everything else dies or stays dead. Every cell applies this at once, to the same snapshot. Nothing else is in the system.

What the controls show:
- Neighbourhood. Conway counts eight neighbours (Moore). Switch to four (von Neumann) and gliders die on the spot. The glider was never in the rule text; it depends on the definition of neighbour.
- Edge. Wrap (torus) or wall. On a torus a glider comes back around; on a walled board it leaves. Neither is "natural"; both are a choice about what happens off screen.
- Rule. B3/S23 is Conway's. B36/S23 (HighLife) has a self-replicating pattern. B1/S1 explodes.

If asked why von Neumann and Ulam built this: they wanted a machine that could build a copy of itself and needed a world simple enough to prove things in. Von Neumann's version used 29 states per cell. His key idea: the blueprint is used twice, once read as instructions and once copied blind. That is the structure DNA turned out to have, and he had it around 1948, before Watson and Crick.

### Loops (`/loops`)

Eno's 2/1 (1978): tape loops of single sung notes, each loop a different length, left running. Because the lengths share no small common multiple, the combination takes a very long time to repeat. The page computes that exactly (least common multiple of the loop lengths in tenths of a second). The default table repeats after about 1,128 years; change one loop by a tenth of a second and it becomes 4,538 or 253. This is arithmetic on numbers the composer set, not creativity in the machine.

Koan (SSEYO, 1994) ran Eno's Generative Music 1 (1996), which shipped as software rather than audio. Wotja is the same engine line today.

### Voices (`/voices`)

The Koan move: a voice does not play a fixed note, it chooses one. Each note is sampled from a probability distribution over the allowed notes. The rules the room can set (register, movement, harmony, temperature) shape the distribution; the "dice" panel shows the probabilities at the moment of each roll.

This is the sampling demonstration in miniature, and the temperature control is the same knob, with the same name and the same math, as on a language model sampler. Do not say that on the page (it stays about music); say it in the room when you get to section 3.

---

## 2. The door game (`/monty-hall`)

Slides 8 and 9. A pickup truck behind one door, Elon Musk behind the other two.

### The rule

You pick a door. The host, who knows where the truck is, opens one of the other two doors, always one with Musk behind it. You may switch to the remaining closed door or stay.

### Why switching wins two thirds

Your first pick is right with probability 1/3. Nothing the host does moves the truck, so that stays 1/3. The truck is behind one of the other two doors with probability 2/3. The host is forced to remove the Musk door from those two (he cannot open yours and cannot open the truck), so switching collects the whole 2/3.

Enumeration, you pick door 1:

| Truck behind | Host opens | Stay | Switch |
| --- | --- | --- | --- |
| 1 | 2 or 3 | wins | loses |
| 2 | 3 | loses | wins |
| 3 | 2 | loses | wins |

Each row has probability 1/3.

### The variant that makes the point

If the host did not know and opened a door at random, and it happened to show Musk, the odds really would be 50/50. Work it out: the cases where he accidentally opens the truck are discarded, and among the remaining cases stay and switch are equal. The information is not in the open door. It is in the fact that the host was constrained when he chose it.

Hundred-door version: you pick one of a hundred, the host opens ninety-eight Musks, one door stays closed. Most people switch immediately. It is the same problem.

### If asked about the history

Marilyn vos Savant published the switch answer in Parade in 1990 and received thousands of letters saying she was wrong, many from people with PhDs. Paul Erdős reportedly refused to accept it until shown a simulation. The simulation button on the page is that argument.

### The link to the rest of the lab

The host's choice is random, but only among the doors the rules allow. That is a constrained draw from a distribution. The rest of the lab is bigger versions of the same thing, with the constraint no longer stated.

---

## 3. Sampling

Slides 10 to 13.

### What a model outputs

A language model does not output a word. For a given input it outputs a score (a logit) for every token in its vocabulary. Softmax turns the scores into probabilities that sum to 1:

p<sub>i</sub> = exp(z<sub>i</sub>) / Σ<sub>j</sub> exp(z<sub>j</sub>)

A separate step picks one token from that distribution. That step is the sampler. It is not part of the weights.

Vocabulary sizes, if asked: GPT-2 has 50,257 tokens; Llama 3 has 128,256; most current models are in the 32k to 200k range.

### Temperature

Divide the logits by T before softmax:

p<sub>i</sub> = exp(z<sub>i</sub>/T) / Σ<sub>j</sub> exp(z<sub>j</sub>/T)

- T below 1 sharpens: the largest probability grows, the rest shrink. As T approaches 0 this becomes argmax (greedy).
- T = 1 is the model's raw distribution.
- T above 1 flattens toward uniform over the vocabulary.

Temperature does not add knowledge or creativity. It reshapes an existing distribution. "Hot" answers are not better ideas, they are lower-probability draws.

### Top-k and top-p

- Top-k: keep only the k highest-probability tokens, renormalize, sample from those.
- Top-p (nucleus sampling, Holtzman et al. 2019): keep the smallest set of tokens whose probabilities add up to p, renormalize, sample. Adapts to how peaked the distribution is: a confident step keeps few tokens, an uncertain step keeps many.
- Greedy: always take the maximum. Deterministic, and tends to loop and repeat in long text.
- Beam search: keep the b most probable partial sequences and extend all of them. Used in translation, rarely in chat.

Repetition penalty, frequency penalty, presence penalty: post-hoc adjustments to the logits that push down tokens already used. Also sampler settings, also not in the model.

### Why the same prompt gives different answers

Because the draw is random. Same weights, same prompt, same distribution, different sample. Setting temperature to 0 makes it nearly deterministic, but not perfectly on real hardware: floating point on GPUs is not bitwise reproducible across batch sizes, and providers batch requests together. If someone says "I set temperature 0 and still got different answers", that is why.

### Where sampler settings live

In a config file, set by whoever deployed the model. Chat products usually run around T = 0.7 to 1.0 with top-p around 0.9 to 0.95. The user does not see any of this. A product that feels bland or feels unhinged is often a sampler setting.

### The Voices link

Every note on `/voices` is one sample from a distribution shaped by four rules, at a temperature. Cold: the most likely note almost every time. Hot: near uniform over the scale. The bars are the distribution at the moment of the draw. A language model's sampler does exactly this over 100,000 tokens instead of 10 notes.

---

## 4. Autoregressive models

Slides 14 and 15.

### The factorization

The probability of a sequence is the product of conditional probabilities, one per token:

p(x<sub>1</sub>, …, x<sub>n</sub>) = p(x<sub>1</sub>) · p(x<sub>2</sub> | x<sub>1</sub>) · p(x<sub>3</sub> | x<sub>1</sub>, x<sub>2</sub>) · … · p(x<sub>n</sub> | x<sub>1</sub>, …, x<sub>n−1</sub>)

The model computes one factor at a time: given everything so far, a distribution over the next token. Sample one, append it, compute the next distribution. That loop is the whole generation procedure.

### Consequences

- No revision. There is no step where the model reads a finished sentence and edits it. Anything that looks like revision is a new sequence conditioned on the old one.
- Output becomes input. An early sample conditions every later one. A wrong draw at word nine is in the context for word ten onward. This is why errors compound over long outputs.
- Training and generation differ. During training the model sees real text and predicts each next token given the true previous ones (teacher forcing). During generation it conditions on its own samples. The gap is called exposure bias.

### Tokens

A token is not a word. Tokenizers (byte-pair encoding, mostly) split text into pieces from a fixed vocabulary: common words are one token, rare words several, and "strawberry" might be "str" + "aw" + "berry". Rough rule: one token is about three quarters of an English word. Questions like "how many r's are in strawberry" fail because the model never sees letters, it sees token ids. Numbers, code, and non-English text tokenize less efficiently.

### Context window

The maximum number of tokens the model can condition on at once. Everything outside it does not exist to the model. Sizes have grown from 2k (GPT-3) to 128k and beyond. Long context is still a window: attention is computed over it, and quality degrades in the middle of very long inputs.

---

## 5. Attention

Slide 16.

### The mechanism

Vaswani et al., 2017. For each position, the model computes a query, a key, and a value (three learned linear maps of the token's vector). Each position's output is a weighted sum of all positions' values, with weights from how well its query matches each key:

Attention(Q, K, V) = softmax(QK<sup>T</sup> / √d) V

Every position can look at every other position directly, in one step. The weights are learned, not written. Several attention heads run in parallel and their outputs are concatenated. Stack tens of layers of this, alternating with small feed-forward networks, and that is a transformer.

Two details that come up:
- Causal mask. In a language model each position may only attend to earlier positions, so the model cannot see the token it is predicting.
- Positional encoding. Attention on its own has no order; position is added to each token's vector so the model can tell first from last.

### The Life comparison, stated carefully

Life: each cell updates from a fixed neighbourhood of eight, by a written rule. Transformer: each position updates from all positions in the window, by a learned rule. The structure (local state, update from neighbours, apply everywhere in parallel) is the same. What changed is who wrote the rule and how big the neighbourhood is. Say that and stop; it is a structural fact, not an analogy about intelligence.

---

## 6. Selfridge, 1958

Slides 17 and 18. The course's namesake.

Pandemonium: A Paradigm For Learning, given at the Mechanisation of Thought Processes symposium, Teddington, 1958.

The architecture: data demons hold the input. Computational demons each look for one feature and "shriek" in proportion to how strongly they see it. Cognitive demons listen to the shrieks and shriek in turn for the pattern they represent. A decision demon picks the loudest. Learning adjusts the weights each demon's shriek carries; demons that prove useless are removed and useful ones are copied with mutations.

What it anticipated: weighted feature detectors (perceptrons, then neural nets), ensembles (many weak detectors, one decision), evolutionary search (mutation and selection of components), and the point in slide 18: the set of demons is stocked by the designer before the system runs. The pandaemonium never chose its own demons.

McCarthy's remark in the discussion, if wanted: the demons' internal work is the unconscious part of thought, what they shout to each other the conscious part.

---

## 7. Latent diffusion

Slides 19 to 25.

### Forward process

Take an image x<sub>0</sub>. Add gaussian noise in steps. At noise level t:

x<sub>t</sub> = √ᾱ<sub>t</sub> · x<sub>0</sub> + √(1 − ᾱ<sub>t</sub>) · ε, with ε ~ N(0, I)

ᾱ<sub>t</sub> runs from 1 (clean) down to about 0 (pure noise). The page uses the cosine schedule (Nichol and Dhariwal, 2021): ᾱ<sub>t</sub> = cos²(πt/2). Stable Diffusion uses a linear schedule over 1,000 steps. The schedule is a design choice; it is one of the things set before the prompt.

### Training

Sample an image, a noise level, and a noise. Make x<sub>t</sub>. Train a network to predict ε from x<sub>t</sub> and t (equivalently, to predict x<sub>0</sub>). The loss is mean squared error between predicted and actual noise. That is the whole objective (Ho et al., 2020, "simple loss").

### Reverse process

Start from pure noise. At each step the network estimates the clean image, the noise is re-derived from that estimate, and the two are recombined at the next lower noise level. Repeat until noise level 0.

### DDPM vs DDIM

Same trained network, different step rule.

- DDPM (Ho et al., 2020): each step adds a fresh random gaussian scaled to the step. The path is a random walk toward the data. Originally 1,000 steps.
- DDIM (Song et al., 2020): each step is deterministic; no new noise after the starting draw. The path is smooth, so 20 to 50 steps suffice. Same seed, same image, always. Because it is a deterministic map from noise to image, it can be run backward (invert an image to its noise) and interpolated (a path between two noises is a path between two images).

One dial between them, η: 0 is DDIM, 1 is DDPM. The step:

x<sub>t−1</sub> = √ᾱ<sub>t−1</sub> · x̂<sub>0</sub> + √(1 − ᾱ<sub>t−1</sub> − σ²) · ε̂ + σ · z

σ = η · √((1 − ᾱ<sub>t−1</sub>) / (1 − ᾱ<sub>t</sub>)) · √(1 − ᾱ<sub>t</sub> / ᾱ<sub>t−1</sub>)

In Stable Diffusion interfaces this is the "sampler" or "scheduler" menu. "Ancestral" samplers (Euler a, DPM2 a) add noise per step like DDPM. Euler, DPM++ 2M, UniPC are deterministic solvers in the DDIM family with better numerics.

### Latent

Rombach et al., 2022. Diffusion on pixels is expensive. Train an autoencoder first: an encoder compresses a 512×512×3 image to a 64×64×4 latent (factor 8 in each dimension), a decoder reconstructs it. Run the whole diffusion process on the latent, then decode once at the end. That is what made Stable Diffusion runnable on a consumer GPU.

The cut to name: the encoder discards information before the prompt arrives. Fine texture, exact text, small faces are things the latent space represents poorly, which is why early SD was bad at hands and lettering. You never see the latent; the decoder's idea of what a latent means fills it in.

### Conditioning and guidance

The prompt goes through a text encoder (CLIP's, in SD 1.x and 2.x) into a sequence of vectors. The denoising network attends to those vectors through cross-attention at each step. That is how text steers the denoiser.

Classifier-free guidance (Ho and Salimans, 2022): run the denoiser twice per step, once with the prompt and once without, and push the prediction away from the unconditional one:

ε̂ = ε<sub>uncond</sub> + s · (ε<sub>cond</sub> − ε<sub>uncond</sub>)

s is the "guidance scale" or "CFG" slider (7 is a common default). Higher values follow the prompt harder and saturate colours; very high values break the image. It is a sampler setting, not a model property. A prompt conditions the sampling; it does not override the training data or the sampler.

### Seeds

The seed sets the pseudo-random generator that draws the starting noise (and, for DDPM-style samplers, the per-step noise). Same seed, same sampler, same settings, same model, same image. Change the seed, get a different draw from the same distribution.

### What `/denoise` actually runs

Not a trained network. For a training set of a few images, the best possible denoiser has a closed form: the expected clean image given the noisy one, which is a weighted average of the training images, each weighted by exp(−‖x<sub>t</sub> − √ᾱ x<sub>i</sub>‖² / 2(1 − ᾱ)). The bars on the page are those weights. The reverse process runs this denoiser with the DDIM/DDPM step above.

Consequences to say out loud:
- It lands on a training image exactly. With a finite set, the ideal denoiser memorizes. A real model's network approximates this quantity for billions of images it cannot store, and generalizes because the network is small relative to the data and smooth.
- With near-duplicate training images, DDIM slides to the most central one from most seeds. DDPM's per-step noise spreads the outcomes. This was visible on your ten storefront images.
- At 64 by 64 the weights lock within a few steps because 4,096 pixels separate images fast. Real models work in a latent space of similar size, so this is not unrealistic.

### The burger clips

Slides 21 and 22. Ten runs, each a burger denoised from pure noise over 42 seconds at 24 frames a second. The grid is all ten synchronized. Every run starts as noise; each ends on a different burger. This is the reverse process at real scale, and the divergence is the seed.

### If asked whether models store training images

Carlini et al. (2023) extracted a few hundred near-exact training images from Stable Diffusion out of billions, by prompting for images that were heavily duplicated in the training set. So: mostly no, occasionally yes, and duplication is the risk factor. The toy page is the extreme case where the answer is always yes.

---

## 8. The four questions

Slide 24. Ask them of anything in the room.

1. What counts as a state: a cell, a token, a latent, a frame?
2. What counts as a neighbour: who is allowed to influence whom?
3. Where did the rule come from: written by a person, or fitted to a corpus someone chose?
4. Who set the sampler, and to what?

Worked for each system:

| | State | Neighbour | Rule | Sampler |
| --- | --- | --- | --- | --- |
| Life | a cell, on or off | 8 (or 4) adjacent cells | written, B3/S23 | none, deterministic |
| Loops | a voice's note and phase | none, voices are independent | written, the table | none |
| Voices | a note | the chord, if harmony is on | written, four settings | temperature, set by you |
| Door game | which door hides the truck | the host's constraint | written, the rules | the host's random choice among allowed doors |
| Language model | a token | the whole context window | fitted to a corpus | temperature, top-p, set by the vendor |
| Diffusion | a latent | the whole latent, via attention | fitted to a corpus | steps, scheduler, CFG, seed, set by the interface |

---

## 9. Questions to expect

**"So is it random or not?"** The model is deterministic: same input, same distribution. The sampler is random. Temperature 0 removes most of the randomness. Floating point on GPUs removes the rest only approximately.

**"Does temperature make it more creative?"** It makes it pick lower-probability tokens. Whether that reads as creative or as nonsense depends on how far you go. The distribution does not change.

**"Why does it make things up?"** It outputs the most plausible continuation given its training and the context. Nothing in the loop checks the output against the world. A confident-sounding false statement is a plausible sequence of tokens. Retrieval and tool use are attempts to put something checkable in the context.

**"Can I get the same image twice?"** Same model, sampler, settings, seed, and prompt: yes, with DDIM-family samplers, bit for bit on the same hardware. Change any one and no.

**"What does the seed actually do?"** Seeds the random number generator that draws the starting noise. It is a number that picks a point in noise space. Nothing else.

**"What's the difference between Stable Diffusion and Midjourney?"** Midjourney does not publish its architecture. As far as is known it is also latent diffusion with a proprietary model, training set, and default sampler settings, behind an interface that hides all of them. The four questions apply; you cannot answer three of them.

**"How much training data?"** Stable Diffusion 1.x: LAION-5B subsets, on the order of billions of image-text pairs scraped from the web. Language models: trillions of tokens. Both are chosen by someone; neither is published in full.

**"Why greyscale and 64 by 64 on the demo?"** So the math is exact and fast enough to run in a browser tab. Colour would triple the numbers and change nothing about the process.

**"Why does the demo always give a training image?"** Because for a finite set the ideal denoiser is a weighted average of the set, and the process sharpens the weights until one is 1. A trained network cannot store its training set, so it does not do this, except when the set contains many duplicates.

**"Is attention the same as looking at the whole sentence?"** Yes, within the context window, with learned weights per position per head. Outside the window, no.

**"What's a token, really?"** A piece of text from a fixed list, chosen for compression, not meaning. Common words are one token; rare words, numbers, and code are several.

---

## 10. Running the demos

- `/voices` and `/loops` need a click on Run before audio plays (browser autoplay rules). Check the projector's audio before class.
- `/denoise` loads its ten images on open; the counter reads 10 / 12 when ready. Generate does nothing on an empty set.
- With the storefront set, DDIM goes to the same image from most seeds. If the room asks why, that is section 7. Switch to DDPM to show the seed mattering.
- The burger grid is 1920 by 420; on a 16:9 projector it is a wide strip. Full screen the deck (F) for it.
- Back links from every demo return to the slide they were opened from.
- The deck is `draft: true`; students cannot open `/lab/1` on the live site until that is removed.

---

## References

- Ho, Jain, Abbeel. Denoising Diffusion Probabilistic Models. 2020.
- Song, Meng, Ermon. Denoising Diffusion Implicit Models. 2020.
- Nichol, Dhariwal. Improved Denoising Diffusion Probabilistic Models. 2021.
- Rombach, Blattmann, Lorenz, Esser, Ommer. High-Resolution Image Synthesis with Latent Diffusion Models. 2022.
- Ho, Salimans. Classifier-Free Diffusion Guidance. 2022.
- Vaswani et al. Attention Is All You Need. 2017.
- Holtzman, Buys, Du, Forbes, Choi. The Curious Case of Neural Text Degeneration. 2019. (Top-p sampling.)
- Selfridge. Pandemonium: A Paradigm For Learning. 1958.
- Carlini et al. Extracting Training Data from Diffusion Models. 2023.
- vos Savant. Ask Marilyn, Parade, September 1990.
