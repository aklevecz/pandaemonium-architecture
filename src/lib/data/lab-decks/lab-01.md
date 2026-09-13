---
number: 1
title: What’s in the box?
stance: Apparatus
draft: true
blurb: The lab’s second half: the door game, sampling, autoregressive models, latent diffusion.
---

@title
eyebrow: Lab 01 · September 14 · A grin without a cat
# What’s in the box?

Monty Hall, sampling, autoregressive models, latent diffusion.

---

@statement
Golly · Koan to Wotja

---

@prose
## What changes in this half

Golly and Wotja have rules you can read. Conway’s Life is three sentences. A Koan patch is a table of settings.

Language models and diffusion models have no rule you can read. You get the output and nothing else.

---

@list
## Where we are going
1. Life, Loops and Voices: three systems with their rules on screen.
2. Intuition: Concrete Probablistic Illusion
3. Sampling: Gaussian distributions, probability as area, Monte Carlo estimates
4. Autoregressive models: in 2017 I wish I had invested in ______
5. Latent diffusion: Noise on noise off

---

@demo
## Life

Conway’s Life. A live cell with two or three live neighbours stays alive. A dead cell with exactly three becomes alive. Everything else dies or stays dead.

[Open the Life board](/life)

1. Draw a shape. Run it.
2. Load Gosper’s gun and leave it running.
3. Switch the neighbourhood to von Neumann. The glider dies.
4. Wall the world instead of wrapping it, then change the rule to B36/S23.

---

@demo
## Loops

Seven voices, one note each, loop lengths that never divide evenly. The table on screen is the whole score. After Eno’s 2/1.

[Open the Loops instrument](/loops)

1. Press run and leave it for two minutes. Read how long until the table repeats.
2. Change one loop length by a tenth of a second and read the repeat time again.
3. Turn drift on. The repeat time disappears.

---

@demo
## Voices

Each note is sampled from a probability distribution. The settings (register, movement, harmony, temperature) determine the distribution, and the panel shows it at the moment each note is chosen.

[Open the Voices engine](/voices)

1. Run it. The dice panel shows the probability of each candidate note when it was chosen.
2. Switch harmony from free to chords. The voices start agreeing on a triad.
3. Set temperature to cold. It picks the most likely note almost every time.
4. Set temperature to hot. The probabilities flatten; any note in the scale is about as likely as any other.
5. Set it back to warm. Add a voice and change its register.

---

@demo
## The host knows

Three doors. A pickup truck behind one, Elon Musk behind the other two. The host knows where the truck is.

[Open the Monty Hall demo](/monty-hall)

1. Ten rounds always staying, then ten always switching. Keep a tally.
2. Run the simulation at 10,000 games and read the two bars.
3. Say why the host opening a door changes the odds.

---

@prose
## What the door game shows

The rules change but our minds cling to practical intuition.

More context and more information about sequential state = greater insight into the likelihood of discrete decisions

---

@statement
The curve is the possibility. The point is the draw.

---

@prose
## Pizza preferences

In Nekhen, open a Class poll and ask: “Which pizza would you choose?” Each person votes once. Freeze the votes and draw an answer.

If 12 of 30 people choose pepperoni, its chance is 40%. It is the most popular choice only if no other option has more votes; it still need not be the next draw.

Pizza types are categories, like possible next words. To use a Gaussian, change the question to a number: how wide is the pizza?

---

@prose
## Pizza diameters

Imagine a kitchen aiming for 12-inch pizzas, with small variations in size. We choose a Gaussian model with mean 12 inches and standard deviation 0.5 inches. This is an assumed model, not measurements from our class.

A 13-inch pizza is two standard deviations above the mean. Under this model, about 2.28% exceed 13 inches.

On the standard Gaussian plot, the center is zero and that threshold is +2. The same bell curve can describe different quantities when we change its location and scale.

---

@demo
## Draw from a Gaussian

A bell curve describes a distribution of values. Its mean sets the center; its standard deviation sets the spread. The curve stays visible while we draw from it.

[Open Gaussian sampling](/sampling#gaussian)

1. Draw one value. It is a point, not a bell curve.
2. Draw twenty, then a thousand. Watch the histogram take shape.
3. Move the mean. The center shifts.
4. Change the standard deviation. The curve widens or narrows, and the samples spread differently.

---

@prose
## Density is not probability

The height of a Gaussian curve is probability density. A probability is an area: the chance that a draw lands within an interval.

The total area is 1. A narrower curve is taller so that the area stays the same. One exact point has no width and therefore zero probability in the ideal continuous distribution; an interval can have positive probability.

---

@demo
## Shade an interval

Use a standard Gaussian: mean zero, standard deviation one. Move the interval boundaries and watch its probability change with the shaded area.

[Open the shaded Gaussian](/sampling#area)

1. Shade from −1 to 1. About 68.27% of the distribution lies here.
2. Expand to −2 and 2: about 95.45%. Then −3 and 3: about 99.73%.
3. Move a narrow interval from the center toward a tail. The same width contains less probability.
4. Collapse the interval to a point. Its probability is zero, even at the peak.

---

@statement
More draws reveal the distribution. They do not change it or make the next draw compensate for the last.

---

@prose
## Monte Carlo

Monte Carlo methods use repeated random samples to estimate a quantity. Sampling gives us one outcome; combining many outcomes lets us estimate a probability or an average.

For our Gaussian, count the draws between −1 and 1, then divide by the total number of draws. That fraction estimates the shaded area. If 7 out of 10 land inside, our estimate is 70%.

The Monty Hall simulation did this too: simulated wins divided by simulated games estimates a strategy’s win rate.

---

@demo
## Estimate the area with samples

The calculated Gaussian area is about 68.27%. Use it to check our Monte Carlo estimate.

[Open Monte Carlo](/sampling#monte-carlo)

1. Run ten trials. Divide the count inside the interval by the total.
2. Add a thousand, then ten thousand. Watch the estimate and its error.
3. Reset and repeat. The same distribution gives a different estimate.
4. More trials usually improve precision, but the error need not decrease with every batch.

---

@prose
## Why simulate?

Sometimes calculating an answer directly is difficult, but generating examples is easy. Monte Carlo turns those examples into an estimate.

For independent trials like these, typical error shrinks as 1/√N. Halving it takes about four times as many trials.

More trials reduce random error. They do not fix incorrect rules or a poorly chosen distribution.

---

@prose
## From numbers to tokens

Our Gaussian distributes probability continuously along a number line. A language model distributes probability over a discrete vocabulary of tokens. A token can have positive probability on its own; an exact point in a continuous Gaussian cannot.

The shared idea is a distribution followed by a selection. Sampling draws according to the distribution. Always taking a peak is a different procedure.

---

@image
![A prompt goes into the model. The model outputs a probability for every token. A separate sampling step draws one token at random. The same prompt on other runs drew different tokens.](/diagrams/sampling.svg)
caption: A language model uses discrete tokens, not a Gaussian curve. The selected outcome still hides the alternatives.

---

@demo
## One draw, different spreads

Keep the center at zero and reuse the same standard Gaussian draw. Changing temperature changes the distribution around it.

[Open the Gaussian temperature comparison](/sampling#temperature)

1. Draw a value. At T = 1 the original and adjusted curves coincide.
2. Lower T. The curve narrows and the adjusted value moves toward the mean.
3. Raise T. The curve widens and the adjusted value moves farther out.
4. Replay the seed, then change it. The seed changes the random input; temperature changes how it is scaled.

---

@prose
## What the analogy carries

In this Gaussian example, temperature T multiplies variance by T, so standard deviation becomes σ√T. The mean stays fixed. Choosing the mean every time would produce the same value, not samples distributed in a bell shape.

Language-model temperature reshapes discrete token probabilities rather than a Gaussian density. Diffusion models use Gaussian noise directly. The common question is how a distribution and a selection procedure become one visible result.

---

@statement
When you see an output, you see one path through the possibilities. You do not see the whole distribution.

---

@prose
## Autoregressive: sampling a sequence

An autoregressive model produces a sequence one token at a time. It samples a token, appends it to the input, and samples the next token conditioned on everything so far. The probability of the whole sequence is the product of those conditional probabilities.

Two consequences. It does not revise: no step looks back at a finished sentence and edits it. And its output becomes its input, so an early sample conditions every later one.

---

@statement
One token, then the next, each conditioned on all the previous ones.

---

@prose
## Attention

Vaswani et al., 2017: every position in a sequence weighs every other position directly, and the weights are learned from data rather than written by a designer.

The structure is the same as Life’s: each position updates from its neighbours. But the rule is learned, not written, and the neighbourhood is the whole context window.

---

@list
## Selfridge, 1958
- A crowd of small detectors, each shrieking in proportion to what it thinks it sees.
- A decision demon that takes the loudest shriek.
- Weights adjusted by worth; useless demons culled, useful ones bred.
- The set of demons is chosen by the designer before the system runs.

---

@quote
> We are proposing here a model of a process which we claim can adaptively improve itself to handle certain pattern recognition problems which cannot be adequately specified in advance.
— O. G. Selfridge, Pandemonium: A Paradigm For Learning (1958), the course’s namesake

---

@prose
## Latent diffusion: sampling an image

Training: take an image, add gaussian noise in steps until it is pure noise, and train a network to reverse one step. Generation: start from pure noise and run the reverse steps.

Rombach et al., 2022, do this in the latent space of an autoencoder rather than on pixels. That made it cheap enough to run on a consumer GPU. It is the architecture behind Stable Diffusion.

---

@demo
## Denoise

A diffusion model on a training set of ten images from a Stable Diffusion finetune Ariel made, plus anything you upload or draw. Noise is added on a schedule; a denoiser estimates the clean image; generation runs the denoiser from pure noise.

[Open the Denoise board](/denoise)

1. Move the noise slider to the right. Watch the estimate turn into the average of the set.
2. Press Generate with the default seed and 25 steps. Watch the bars pick an image.
3. Change the seed and generate again. With DDIM it usually lands on the same image; switch the scheduler to DDPM and it does not.
4. Upload a photo of your own, add it to the set, and generate until it comes out.

---

@video
![A burger emerging from pure noise over 42 seconds](/lab/burger-blooming.mp4)
caption: One of Ariel’s burger clips. An image denoised from pure noise, 42 seconds, 24 frames a second.

---

@statement
Generation is sampling here too. The seed sets the starting noise; a different seed gives a different image from the same prompt.

---

@prose
## What is set before the prompt

You never see the latent space. The encoder discards information before your prompt arrives, and the statistics of the training set fill in the result.

The sampler is a set of choices: number of denoising steps, which scheduler, the guidance scale that sets how strongly the prompt pulls. These are set by whoever built the interface.

---

@statement
A prompt conditions the sampling. It does not override the training data or the sampler settings.

---

@list
## Four questions, any system in this room
1. What counts as a state: a cell, a token, a latent, a frame?
2. What counts as a neighbour: who is allowed to influence whom?
3. Where did the rule come from: written by a person, or fitted to a corpus someone chose?
4. Who set the sampler, and to what?

---

@quote
> Whatever else AI is, it is not neutral, and neither can we be. AI is political because it acts in the world in ways that affect the distribution of power, and its political tendencies are revealed in the ways that it sets up boundaries and separations. The apparatus of AI forms feedback loops with the rest of society: it’s “a structured structure that becomes a structuring structure” (Bourdieu, 1980)
— Dan McQuillan, Resisting AI, an Anti-fascist Approach to Artificial Intelligence
