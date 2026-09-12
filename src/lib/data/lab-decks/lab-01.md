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
3. Sampling: How many rabbits you got in that hat?
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

@prose
## Sampling: what the model actually outputs

A language model does not output a word. It outputs a probability for every token in its vocabulary. A separate step then picks one token from that distribution.

That step is sampling. It is not part of the model’s weights, and it is random. The same model with the same prompt gives different outputs on different runs because the sample differs.

---

@image
![A prompt goes into the model. The model outputs a probability for every token. A separate sampling step draws one token at random. The same prompt on other runs drew different tokens.](/diagrams/sampling.svg)
caption: The model outputs the distribution. Sampling picks from it.

---

@statement
Temperature reshapes the distribution before the draw. Low: the most likely option almost always. High: close to uniform over everything allowed.

---

@prose
## Other sampler settings

Temperature is one of several. Top-k keeps only the k likeliest options before drawing. Top-p keeps the smallest set of options whose probabilities add up to p. Greedy decoding skips the draw and always takes the maximum.

None of these are in the model. They are set in the sampler, by whoever deployed it, usually in a config file. They change the output as much as prompt wording does.

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
