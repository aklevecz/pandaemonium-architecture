# Lab 01 notes: What's in the box?

Ariel's half. Monty Hall, sampling, autoregressive models, latent diffusion. Written to go deeper than the slides when someone asks, and to review from.

Deck: `/lab/1`. Pages: `/life`, `/loops`, `/voices`, `/monty-hall`, `/sampling`, `/denoise`.

Use **Experiences** in the slide controls to jump to any of these demos or the Nekhen class room. The menu also appears in the course demos’ top navigation and Nekhen’s classroom header. Start from the desired Nekhen room and use **Lab slides** once to connect that room to the deck; subsequent jumps return to that same room. Slide links carry your current position, including when returning through another experiment. The menu stays available in slide fullscreen. Navigation uses the current tab; Nekhen votes and draws are saved, but local experiment state may restart when leaving a page.

---

## 0. The frame in one paragraph

Scott's half shows systems whose rules are written down: Conway's Life is three sentences, a Koan patch is a table. This half shows systems whose rules are fitted to data and cannot be read. One useful question for both is what varies from run to run and why. Life and the fixed Loops score can be deterministic; Voices explicitly samples notes. Language generation and diffusion introduce their own distributions and selection procedures. Keep three things separate: the system that sets the possibilities, the distribution over those possibilities, and the procedure that produces the visible outcome.

---

## 1. Handoff: Life, Loops, Voices

Scott ran Golly and Wotja; these are our own versions, so the room can touch them.

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

Before playing, use a separate Nekhen **Monty Hall poll** to ask which strategy gives the best chance: Switch, Stay, or It doesn’t matter. The prompt states that the prize is equally likely behind each door and that the informed host always opens an unchosen empty door and offers a switch. Freeze predictions before testing strategies. Vote shares measure the class’s beliefs, not win probabilities. The poll links directly to the door experiment; its Experiences menu returns to the same prediction room. Keep the pizza poll in its own room.

A pickup truck behind one door, Elon Musk behind the other two.

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

## 3. Sampling through Gaussian distributions

Allow about 20 minutes between Monty Hall and autoregression. `/sampling` starts with a Gaussian curve and builds every experiment around it. The reading page and the slides share four stops: draw, shade, estimate with Monte Carlo, change the spread.

### The sentence to keep returning to

**The curve is the possibility. The point is the draw.**

A distribution is not the latest output. We can hold a Gaussian completely fixed and keep obtaining different values from it. This makes visible something a generated sentence often hides: the possibilities available before one result appeared.

### Experiment 1: draw from the curve (`/sampling#gaussian`)

Optional opening in Nekhen: create a fresh room in **The Next Word**, choose **Class poll**, and ask “Which pizza would you choose?” Share the room link, collect one preference per browser, and freeze voting. The bars show a categorical distribution. If 12 of 30 votes are pepperoni, its chance is 40%. Draw one answer, then ten, then a thousand with replacement. Compare the sampled proportions with the fixed class shares. Clear draws and repeat without changing votes. This is the concrete classroom example to revisit when introducing Monte Carlo.

Pizza types are not Gaussian. To move to the bell curve, change the question from type to diameter: imagine a kitchen aiming for 12-inch pizzas with standard deviation 0.5 inches. This is an assumed model of size variation, not a distribution measured from students. Under this model, a diameter above 13 inches is more than two standard deviations above the mean, with probability about 2.28%. The standard-normal plot uses z = (diameter − 12) / 0.5. In the area demo, shading 2 to 4 approximates the upper tail; the small area beyond 4 remains outside the plot. Counting all simulated diameters above 13 would estimate the full event.

Nekhen’s poll mode uses vote shares directly. Its separate **Next word / logits** mode applies softmax to vote counts, so the displayed probabilities differ. Keep the mode distinction explicit. The poll supports phone voting, projector view, a shared latest draw, aggregate counts, clearing draws, and JSON export. It remains a local preview until both Nekhen services are deployed; instructions are in `work/nekhen-next-word/NEXT_WORD.md`.

Start with mean μ = 0 and standard deviation σ = 1. Draw once. Point to the single tick under the curve. Nothing bell-shaped has been produced; one number has been produced from a bell-shaped distribution.

Draw twenty. The histogram appears. Draw a thousand and compare the collective shape with the theoretical curve. The histogram is an observation of the draws, while the curve is the rule that generated them. Its bars show density: count divided by total draws and bin width. This puts the bars and the curve on the same vertical scale. With few observations the bars can be uneven, and more observations need not improve every bin on every step.

Move μ and keep σ fixed: the center shifts. Move σ and keep μ fixed: the spread changes. The samples clear when either changes so that observations from different distributions are not combined. The horizontal axis stays fixed, making the change in location and spread visible. The vertical axis adjusts to fit the curve and histogram; read its density labels when comparing heights.

The visible window is finite, but a Gaussian has unbounded tails. Draws outside the window are counted below the plot and included in the histogram's denominator. They are not clamped to the edge or discarded to make the shape prettier.

A draw below the mean does not make one above the mean due. These draws are independent. The sample mean tends toward μ over many draws from the fixed distribution; it is not a mechanism that compensates after each result.

### Experiment 2: probability is an area (`/sampling#area`)

Use the standard Gaussian again. Shade from −1 to 1: about 68.27%. Expand to ±2: 95.45%. Expand to ±3: 99.73%. These are areas under the curve, not heights and not promised counts in the next batch.

Now keep the interval narrow and move it toward a tail. Equal widths contain different amounts of probability depending on where they sit. Collapse the interval to a point: its area is zero, even if the point is the mean and has the highest density.

This is the distinction to say carefully: **an ideal continuous distribution assigns probability to intervals; its curve shows density**. A single exact value occupies no width. A displayed value is rounded, so a displayed “0.100” represents a small interval of possible underlying values. The computer also has finite precision; do not confuse its finite collection of representable numbers with the ideal continuous model.

The total area is 1. When σ shrinks, the curve grows taller to preserve that area. Density can exceed 1 because its units are inverse units of x; probability cannot. The normal density is:

f(x) = exp(−(x−μ)² / (2σ²)) / (σ√(2π))

The interface computes interval areas numerically. The percentages are rounded, not exact symbolic evaluations.

### Experiment 3: Monte Carlo (`/sampling#monte-carlo`)

“We have a distribution and we know how to draw from it. Now we can use those draws to answer a question.” Monte Carlo methods use repeated random samples to estimate quantities such as probabilities and averages.

Keep the standard Gaussian and the interval −1 to 1 fixed. Each trial is one draw. Score it 1 if it falls inside the interval and 0 otherwise. The average of these scores—hits divided by trials—estimates the probability, which is also the shaded area. For example, 7 hits in 10 trials gives 70%. It is an estimate, not a new value for the underlying probability.

Run ten trials, then add a thousand and ten thousand. Read the estimate beside the calculated area, about 68.27%. The page reports their absolute difference in percentage points. Reset and repeat so students see that another run gives another estimate. All samples count in the denominator, including those outside the visible plot.

The estimate need not improve after every batch. For independent Bernoulli trials with probability p, its standard error is √(p(1−p)/N). Here that is about 1.47 percentage points at 1,000 trials and 0.47 at 10,000. These describe the spread across repeated runs, not guaranteed error bounds. Four times as many trials roughly halves typical error. More samples cannot repair a wrong distribution or simulation rule.

Connect back to Monty Hall: the simulation estimated a strategy’s win rate by playing many games and counting wins. Monty Hall is the name of the door problem; Monte Carlo is the general method used to estimate the result. A next-token draw is sampling; aggregating repeated draws to estimate a quantity is a Monte Carlo use of sampling.

Likely question: “Why simulate if we already know the answer?” Here we can check the estimate against a numerical calculation. In harder problems, we may be able to generate outcomes without being able to calculate the desired average or probability directly. The known Gaussian area makes the method easy to inspect before applying it elsewhere.

### Experiment 4: same random input, different spread (`/sampling#temperature`)

Draw a standard Gaussian value z. The blue dot is z under the original σ = 1 curve. The gold dot is √T · z under the adjusted curve. At T = 1 they coincide. Lower T contracts the distribution and moves the adjusted draw toward zero; higher T expands both the spread and the distance of that same draw from zero.

This is a controlled comparison, not two independent draws. We deliberately reuse the same random input so that the only change is the transformation. Changing the seed generates a new z. Replaying the same seed produces the same z here because the pseudorandom generator and procedure are fixed.

Why the square root? We define temperature by raising the density to the power 1/T and renormalizing. For a Gaussian, that multiplies variance by T, so standard deviation becomes σ√T while μ stays unchanged. T must stay positive in this density calculation. The zero-temperature limiting distribution would concentrate at the mean; it is not a Gaussian with positive width.

Compare with “always pick the peak.” That yields zero every time. A list of zeros does not reproduce the Gaussian. Being the densest location is not the same as being the only location a sampler can produce.

### Bridge to language models and diffusion

Do not imply that a language model's next-token probabilities form a Gaussian. Its outcomes are discrete vocabulary entries. Each token can have a positive probability on its own, whereas an exact point in the ideal continuous Gaussian has probability zero. The transferable idea is the separation of a distribution from the procedure that selects an outcome.

Language models output token scores (logits), and softmax with temperature converts them into probabilities: pᵢ = exp(zᵢ/T) / Σⱼ exp(zⱼ/T). The underlying scores can stay fixed while the sampling probabilities change. Top-k and top-p additionally exclude candidates and renormalize; they are different operations from simply widening a Gaussian.

Diffusion uses Gaussian noise directly, so the connection there is concrete. Many draws can form a noise vector or image. The seed initializes a pseudorandom procedure; it does not add knowledge or change the trained model. Exact replay in this little experiment does not promise identical behavior across all hosted AI systems, hardware, and software versions.

Nekhen's **The Next Word** remains the discrete classroom counterpart: participants propose words, vote to create toy logits, and sample a next word. Votes `[3, 2, 1]` become about `[66.5%, 24.5%, 9.0%]` at T = 1, not their vote shares. After a word is selected, it becomes context for fresh predictions. That differs from the independent draws under an unchanged Gaussian in our first experiment.

The Nekhen demo is still local work on `codex/nekhen-next-word`; deploy its worker and frontend before inviting students on their own devices. Its facilitation guide is `work/nekhen-next-word/NEXT_WORD.md`. The course app's Gaussian experiments need no account, audio, or model service.

### Questions to expect

- “Why didn't this sample land at the peak?” The peak is the highest density, not a command to choose it.
- “Is the curve made by the dots?” Here the curve is specified first; the sampled dots build an empirical histogram that approximates it.
- “Can the density be greater than one?” Yes. Probability is area, not height.
- “If every exact point has probability zero, how does anything happen?” Any nonzero interval can have positive probability; a continuum is not a countable list of point probabilities to add. Our displayed numbers also stand for rounded intervals.
- “Does a thousand draws guarantee the shape?” No. It usually makes the approximation clearer; finite samples still fluctuate.
- “Are all random distributions Gaussian?” No. We chose one family with an explicit rule. The next-token distribution is categorical.
- “Does temperature change the model?” In this comparison the original distribution remains fixed; the distribution used for sampling is transformed. In language decoding, the learned weights need not change either.

Reference: [NIST, Normal Distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm). For the discrete decoding bridge: [Hugging Face, generation strategies](https://huggingface.co/docs/transformers/main/en/generation_strategies).

---

## 4. Autoregressive models

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

The course's namesake.

Pandemonium: A Paradigm For Learning, given at the Mechanisation of Thought Processes symposium, Teddington, 1958.

The architecture: data demons hold the input. Computational demons each look for one feature and "shriek" in proportion to how strongly they see it. Cognitive demons listen to the shrieks and shriek in turn for the pattern they represent. A decision demon picks the loudest. Learning adjusts the weights each demon's shriek carries; demons that prove useless are removed and useful ones are copied with mutations.

What it anticipated: weighted feature detectors (perceptrons, then neural nets), ensembles (many weak detectors, one decision), evolutionary search (mutation and selection of components), and the point in slide 18: the set of demons is stocked by the designer before the system runs. The pandaemonium never chose its own demons.

McCarthy's remark in the discussion, if wanted: the demons' internal work is the unconscious part of thought, what they shout to each other the conscious part.

---

## 7. Latent diffusion

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

Ten runs, each a burger denoised from pure noise over 42 seconds at 24 frames a second. The grid is all ten synchronized. Every run starts as noise; each ends on a different burger. This is the reverse process at real scale, and the divergence is the seed.

### If asked whether models store training images

Carlini et al. (2023) extracted a few hundred near-exact training images from Stable Diffusion out of billions, by prompting for images that were heavily duplicated in the training set. So: mostly no, occasionally yes, and duplication is the risk factor. The toy page is the extreme case where the answer is always yes.

---

## 8. The four questions

Ask them of anything in the room.

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

**"So is it random or not?"** Separate the scores from the selection. Sampling introduces randomness into token selection; greedy decoding does not perform that random draw. Real serving systems may have other sources of variation, so a reproducibility claim needs the same model, inputs, procedure, and execution conditions.

**"Does temperature make it more creative?"** Higher temperature gives lower-scoring tokens relatively more probability. The sampling distribution changes; the underlying model scores do not. Whether the result reads as creative, useful, or incoherent depends on the context.

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

- `/sampling` runs without audio or a server connection. Its four experiments are linked from the deck; each returns to its originating slide.
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
