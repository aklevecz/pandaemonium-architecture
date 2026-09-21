# Conditioning: history and fundamentals, through Stable Diffusion

Teaching notes for lab. Quotes from the latent diffusion paper were checked
against the copy on the site (`static/reading-content/robin-rombach-...md`). The
"10% dropping of the text-conditioning" figure is from the Stable Diffusion v1
model card. Dates and paper details in the history section are from memory and
are worth a second look before you put a year on a slide.

---

## 1. The one-sentence version

A generative model learns a distribution over images, p(x). **Conditioning** is
everything you hand the model so that it samples from a narrower distribution,
p(x | c), instead. The prompt is one condition. So are the seed image, the mask,
the depth map, and even the noise level.

Two things to say early, because students mix them up:

- **Conditioning does not change the model.** It changes which part of what the
  model already knows gets sampled. Training and fine-tuning (LoRA, Lab 03) change
  the model. Conditioning only steers it.
- **The condition is evidence, not a command.** This is the Monty Hall point from
  Lab 01 again. The prior is what the model draws with no prompt. The prompt
  updates it. A strong prior can outweigh a weak prompt: "a slice of pizza" came
  back as a whole pizza 21% of the time.

---

## 2. Five ways to get a condition into a network

Every system below uses one or more of these. It is worth drawing them once.

1. **Concatenate it to the input.** Glue the condition onto what goes in. The first
   conditional GAN did this with a class label; the Stable Diffusion inpainting
   model does it with the mask and the masked image.
2. **Add it to the features.** Turn the condition into a vector and add it inside
   the network's blocks. Stable Diffusion does this with the timestep.
3. **Scale and shift the features.** Let the condition set a multiplier and an
   offset for each channel (conditional batch norm, FiLM, AdaIN). This is how
   StyleGAN injects style and BigGAN injects the class.
4. **Attend to it.** Let each part of the image look up the parts of the condition
   that matter to it. This is cross-attention, and it is how Stable Diffusion reads
   the prompt.
5. **Steer the sampling from outside.** Leave the network alone and push each
   sampling step toward the condition. This is guidance.

---

## 3. A short history

**Before images: conditional probability and translation.**
Conditioning is as old as p(x | y). The modern form comes from machine
translation. Sequence-to-sequence models (2014) generate a French sentence
*conditioned on* an English one, and attention (Bahdanau, 2014) let each output
word look back at the input words that matter. The Transformer (Vaswani et al.,
2017, in your week 1 readings) made that "encoder-decoder attention" a standard
part. Stable Diffusion's prompt reading is that same mechanism, pointed at an
image instead of a sentence.

**2014 to 2018: conditional GANs.**
- *Conditional GAN* (Mirza and Osindero, 2014): give the class label to both the
  generator and the discriminator. "Draw a 7."
- *Text to image with GANs* (Reed et al., 2016; StackGAN, 2017; AttnGAN, 2018):
  a sentence embedding goes into the generator. AttnGAN added attention over
  individual words. Results were small and narrow: birds, flowers.
- *pix2pix* (Isola et al., 2017): condition on a whole image. Edges to photo, map
  to aerial view. CycleGAN did it without paired examples.
- *Conditional normalization* (FiLM, AdaIN, 2017 to 2018), then *StyleGAN* and
  *BigGAN* (Brock et al., 2018, which is in the site's library). BigGAN is
  class-conditional and introduced the **truncation trick**: sample less random
  noise to get better-looking, less varied images. That is the GAN ancestor of
  the guidance scale.

**2021: two things arrive in the same month.**
- *CLIP* (OpenAI, January 2021) learns one space where an image and its caption
  land near each other, from 400 million image and caption pairs scraped from the
  web. For the first time there is a general, open-vocabulary way to score "does
  this picture match this text."
- *DALL·E* (OpenAI, January 2021) treats text tokens and image tokens as one long
  sequence and predicts the next token. Conditioning on text is just "the text
  comes first."
- Artists immediately used CLIP as a steering wheel: *VQGAN+CLIP* and *BigSleep*
  (2021) nudge an image, step by step, toward a higher CLIP score for the prompt.
  This is method 5, and it is where the prompt-art scene started. (Poliks and
  Trillo's footnote 140 mentions BigSleep.)

**2020 to 2022: diffusion and guidance.**
- *DDPM* (Ho et al., 2020) makes diffusion work well. It is unconditional.
- *Classifier guidance* (Dhariwal and Nichol, 2021): train a separate classifier on
  noisy images, and at each denoising step push the image in the direction that
  makes the classifier more sure of the class. In Bayes terms: p(x | c) is
  proportional to p(x) times p(c | x), and the classifier supplies p(c | x).
- *Classifier-free guidance* (Ho and Salimans, 2021): drop the classifier. During
  training, blank out the condition some of the time, so one network learns both
  the conditional and the unconditional prediction. At sampling time run both and
  exaggerate the difference. This is what every current image model uses.
- *GLIDE* (OpenAI, December 2021): text-conditional diffusion. It compared CLIP
  guidance with classifier-free guidance, and classifier-free won.
- *DALL·E 2* (April 2022) and *Imagen* (Google, May 2022). Imagen's finding: a
  bigger text encoder helped more than a bigger image model.

**December 2021 to August 2022: latent diffusion and Stable Diffusion.**
Rombach, Blattmann, Lorenz, Esser and Ommer run diffusion in the compressed space
of an autoencoder, which makes it cheap, and add what they call "a
general-purpose conditioning mechanism based on cross-attention." In their words,
"By introducing cross-attention layers into the model architecture, we turn
diffusion models into powerful and flexible generators for general conditioning
inputs such as text or bounding boxes." Stable Diffusion, released August 2022
with open weights, is that design with CLIP's text encoder plugged in.

**After August 2022: the open model gets more handles.**
Because anyone could run and modify it, new conditions arrived within months:
- *img2img* and *inpainting*: condition on an existing image or a mask.
- *Negative prompts* (a community invention): say what to steer away from.
- *Textual inversion* and *DreamBooth* (August 2022): teach it a new word or subject.
- *InstructPix2Pix* (late 2022): condition on an image plus an edit instruction.
- *ControlNet* (February 2023): condition on edges, depth, pose or scribbles.
- *IP-Adapter* (2023): use an image as the prompt.
- *LoRA*: not conditioning. It changes the model's prior. Lab 03.

None of these came from the original authors. That is a point about open weights
worth making out loud, and it connects to the /scale chart: you can only add
handles to a model you can hold.

---

## 4. Fundamentals, step by step, in Stable Diffusion 1.5

**Step 1. The prompt becomes tokens.**
CLIP's tokenizer splits the prompt into word pieces from a vocabulary of about
49,000, adds a start token (49406) and an end token (49407), and pads to exactly
77 positions. Anything past 77 tokens is cut off. The /denoise page shows this.

**Step 2. Tokens become vectors that know their neighbours.**
CLIP's text encoder (a transformer, 123 million parameters, frozen, never trained
as part of Stable Diffusion) turns the 77 tokens into 77 vectors of 768 numbers.
Each vector has mixed in its context, so "bank" next to "river" is a different
vector from "bank" next to "money."

Worth saying: this encoder was trained by OpenAI on captions scraped from the web
to match images to text. Stable Diffusion never sees your words. It sees CLIP's
reading of them. What CLIP could not tell apart, Stable Diffusion cannot be asked
for. That is why it is bad at counting, at left and right, and at "not."

**Step 3. The image starts as noise, in latent space.**
The seed picks a 64 by 64 by 4 block of Gaussian noise. That is the prior sample.
The autoencoder will turn the finished 64 by 64 latent into a 512 by 512 picture
at the end.

**Step 4. The denoiser is conditioned twice at every step.**
The U-Net (860 million parameters) predicts the noise in the current latent. It
takes two conditions:

- *The timestep.* How noisy is this? It is turned into a vector and added inside
  every block (method 2). Students do not think of this as conditioning, but it is:
  the same network behaves differently at step 5 and step 45 because it is told
  which one it is on.
- *The text.* Inside the U-Net, at several resolutions, there are cross-attention
  layers (method 4). The paper's formula is Attention(Q, K, V) = softmax(QKᵀ/√d)V.
  The queries Q come from the image: each location in the latent grid asks a
  question. The keys K and values V come from the 77 text vectors. Each location
  ends up with a weighted mix of the words that matter to it. The patch that is
  becoming the dog's ear attends to "dog"; the background attends to "beach."

  The early, noisy steps settle composition, so that is when words about layout and
  subject have their effect. The late steps settle texture.

**Step 5. Guidance turns the dial.**
During training the caption was blanked 10% of the time (the model card: "10%
dropping of the text-conditioning"), so the network can predict noise both with
and without the prompt. At every sampling step it runs twice:

    ε = ε_without + s × (ε_with − ε_without)

s is the guidance scale, called CFG in every interface, and 7.5 by default.

- s = 0: ignore the prompt. You get the model's prior.
- s = 1: the plain conditional model. Accurate but soft and unfocused.
- s = 7 or so: what people actually use. Closer to the prompt, less varied.
- s = 15 and up: burnt colors, harsh contrast, everything the same.

In Bayes terms s raises p(prompt | image) to a power. It is the same trade as
temperature in Lab 01: match the prompt more, vary less. The /denoise page runs
this for real at s = 0, 1, 3 and 7.

**A negative prompt** replaces the empty prompt in ε_without. The arithmetic then
pushes away from it. It is not a separate feature, just a different anchor.

**Step 6. Decode.** The autoencoder turns the latent into pixels. No conditioning
here at all.

---

## 5. Every handle in the interface, and which mechanism it is

This table is the one to leave up when students open ComfyUI or Fal.

| Handle | What it conditions | Mechanism |
|---|---|---|
| Prompt | Content | Cross-attention, plus guidance |
| Negative prompt | What to avoid | The anchor of guidance |
| CFG / guidance scale | How hard to follow the prompt | Guidance |
| Seed | Which starting noise | The sample from the prior |
| Steps, sampler | How the path from noise is walked | Not conditioning, but changes the result |
| img2img, "strength" | Start from a noised copy of your image | The starting point |
| Inpainting mask | Which pixels may change | Concatenated to the input |
| ControlNet (edges, depth, pose) | Structure | A copy of the encoder adds to the U-Net's features |
| IP-Adapter | An image used as the prompt | Extra cross-attention |
| LoRA, DreamBooth | Not conditioning | Changes the model itself |

---

## 6. In the room

**Demos already on the site:**

1. /pizza, the "no prompt" tab. That is s = 0 at scale: the unconditioned prior is
   a stock photograph of happy people. Then "pizza," then "a slice of pizza." One
   word moves the distribution; it does not pick an image.
2. /denoise, the text encoding section. Tokens, the 49406 and 49407 markers, the
   cross-attention formula, then guidance at 0, 1, 3 and 7 on the same seed.
3. In any Stable Diffusion interface: fix the seed and sweep CFG from 1 to 20.
   Then fix CFG and change only the seed. Students see the two separate sources of
   difference: the condition and the sample.

**Four misconceptions to head off:**

1. "The model understands my prompt." It receives 77 vectors from a frozen encoder
   trained on web captions. Prompt tricks ("trending on artstation," "4k") work
   because those words sat next to certain images in the training captions.
2. "More words means more control." Past 77 tokens they are dropped, and attention
   is a fixed budget: each extra word takes weight from the others.
3. "A higher guidance scale is more accurate." It is more extreme. It trades
   variety for agreement, and then for burnt images.
4. "The prompt decides the image." The prior, the seed and the sampler decide most
   of it. The prompt leans on them.

**A ten-minute version:**

1. One sentence: conditioning narrows the distribution (1 min).
2. No-prompt pizza tab: this is what unconditioned looks like (2 min).
3. History in three beats: label into a GAN (2014), CLIP gives text and images one
   space (2021), classifier-free guidance makes it a dial (2021 to 2022) (3 min).
4. Inside Stable Diffusion: 77 vectors, cross-attention, run twice, exaggerate the
   difference. Use /denoise (3 min).
5. The handles table, then open the tools (1 min).

---

## 7. Links to the readings

- **Vaswani et al.** (week 1): cross-attention is their encoder-decoder attention.
- **Rombach et al.** (on the site): section 3.3, "Conditioning Mechanisms," is two
  paragraphs and readable.
- **Poliks and Trillo** (week 1): "content itself is subordinated to location." The
  prompt reaches the image only as positions in CLIP's embedding space.
- **Jacques** (week 1): Duchamp's gap between what was intended and what got
  expressed. Conditioning is the engineering of that gap, and the guidance scale is
  a knob on it.
- **Week 2, Dark Forest and antimemetics:** what CLIP never saw captioned cannot be
  asked for. The conditioning vocabulary is set by what was public and labeled.
