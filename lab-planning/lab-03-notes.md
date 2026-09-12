# Lab 03 notes: Fitting frequencies, computer perception and aesthetics

Deck: `/lab/3`. Lab items from the syllabus: Iman Malik, colour, style and LoRAs, training a LoRA if time permits.

---

## 0. The frame in one paragraph

A model does not see an image. It sees an array of numbers in a colour space someone chose, compressed by an encoder someone trained, and it has been fitted to a corpus someone assembled. "Style" is not a quality the model perceives; it is a direction in that fitted space that we can isolate and reuse. A LoRA is the cheapest known way to isolate one. This lab is about what gets thrown away before the model ever looks, and about the smallest possible object that changes what comes out.

---

## 1. Iman Malik

**To confirm before class.** I could not verify from the syllabus alone which of Iman Malik's projects or talks is intended here, and I am not going to invent a biography. Fill this section in from Scott's source, then it can carry the opening.

What the slot is for, structurally: the syllabus places a named practitioner at the head of a session about machine perception and aesthetics, before the technical material. Whatever the specific work, the useful framing for the room is the one this whole lab runs on: a practitioner making choices inside a pipeline whose defaults were set by someone else.

---

## 2. Colour, the part nobody checks

This is the best "the apparatus decided before you arrived" example in the course, because it is verifiable on screen in ten seconds.

### How a pixel is stored

Three numbers, usually eight bits each, meaning red, green, blue. Eight bits gives 256 levels per channel, about 16.7 million combinations. That is a storage format, not a fact about light or about eyes.

### sRGB and gamma

The numbers are not linear in light. sRGB (standardised 1999) applies a transfer curve of roughly 2.2, so a pixel value of 128 is about 22 percent of the light of a pixel value of 255, not 50 percent. The reason is historical (CRT response) and perceptual (human vision is more sensitive to differences in the dark, so the encoding spends more codes there).

Consequences worth demonstrating: naively averaging two sRGB values gives the wrong colour. Blurring, resizing, and blending in sRGB rather than linear light is why some software makes edges look muddy. Most image models were trained on sRGB pixel values without linearising, so they learned the curve as part of the data.

### Colour spaces that model perception

- **HSV and HSL** are just cylinders over RGB. Convenient for pickers, not perceptual.
- **CIELAB** (1976) tries to make equal numeric distance mean equal perceived difference. Roughly true, not exactly. It is why "perceptually uniform" palettes exist and why viridis replaced jet in scientific plotting.
- **Gamut.** sRGB cannot represent all visible colours. Neither can your screen. Display P3 is wider. An image is always already clipped to something.

### Colour inside a diffusion model

Two facts that explain artefacts students actually see:

- The latent space of Stable Diffusion is four channels, not three, and they are not red, green and blue. Colour is entangled across them. The VAE decoder reconstructs RGB at the end, and it is lossy, which is why fine texture and small text degrade even before any generation happens. Worth showing: encode and decode an image with no diffusion at all, and look at what changed.
- **The dark image problem.** Standard diffusion noise schedules never quite reach pure noise at the last step, so the model always retains a little information about the average brightness of the training set. The result is that these models struggle to produce a genuinely black or genuinely white image, and default to mid grey. This was diagnosed publicly as the offset noise issue (2023) and formalised as the zero terminal signal to noise ratio problem. It is a bug in the schedule, not an aesthetic preference, and for two years it shaped what a whole generation of images looked like.

That last point is the lab in one example: an aesthetic that everybody read as a style was a numerical artefact of a schedule.

---

## 3. Style, operationally

Set aside the art historical sense for a moment and define style the way the pipeline does: a consistent bias in the output that survives changes of subject. If every image comes back with the same palette, the same edge quality, the same lighting logic, whatever is causing that is style in the operational sense.

There are four common ways to install one, in increasing order of cost:

1. **Prompt.** Words that correlate with the look in the training captions. Cheap, unreliable, and entirely dependent on how the corpus was captioned. "In the style of X" works only if X was captioned that way, which is why the technique works better for dead painters than living illustrators.
2. **Textual inversion** (Gal et al., 2022). Learn a new token embedding, a few kilobytes, that points at a region of the existing space. The model is unchanged. It can only reach what the model can already represent.
3. **LoRA** (Hu et al., 2021). A small additive change to the weights themselves. Section 4.
4. **Full fine tune** or DreamBooth (Ruiz et al., 2022). Update all the weights. Expensive, and prone to forgetting everything else.

---

## 4. LoRA, the actual mechanism

LoRA came from language models in 2021 and was adopted for image models because it made style sharing possible on consumer hardware.

### The idea

A weight matrix `W` in the network is large, say 1024 by 1024, about a million numbers. Fine tuning means finding `W + ΔW`. LoRA's claim is that the useful `ΔW` for a specific adaptation is low rank, meaning it can be written as the product of two thin matrices:

```
ΔW = B · A        A is r × 1024,  B is 1024 × r
```

With `r = 8` that is 2 × 8 × 1024 = about 16 thousand numbers instead of a million. You train only `A` and `B`, freeze `W`, and at inference you add the product back in. Nothing about the base model changes on disk, which is why LoRAs are files of a few megabytes that stack.

### The knobs, and what they mean

- **Rank (`r`)**. How much capacity the adapter has. 4 to 16 for a style, 32 to 128 if you are trying to teach a subject or a whole aesthetic system. Higher rank is not better; it overfits faster and the file grows linearly.
- **Alpha**. A scaling factor; the adapter's contribution is multiplied by `alpha / r`. Convention is alpha equal to r, or twice r. If you change rank and keep alpha fixed you have silently changed the strength.
- **Which layers.** Usually the attention projections (query, key, value, output) in the diffusion backbone, sometimes the text encoder too. Training the text encoder makes trigger words stronger and makes the LoRA more likely to damage unrelated prompts.
- **Weight at inference.** Applied at 0.6 or 0.8 rather than 1.0 in most workflows. This is a dial the interface may or may not show you.

### Training one, practically

If there is time in the room, this is the shape of it:

- **Dataset.** 15 to 30 images for a style. More is not automatically better; consistency matters more than count. Vary the subject, keep the look constant, or the LoRA will learn the subject instead of the look.
- **Captions.** Every caption should describe what varies and not describe what you want absorbed into the trigger. If all the images are captioned "a painting of a cat in xyzstyle", the token learns cat as much as style.
- **Trigger word.** Pick a string with no existing meaning. Real words drag their existing associations in.
- **Resolution and buckets.** Training at 512 or 1024, with aspect ratio bucketing so images are not all square cropped.
- **Learning rate and steps.** Roughly 1e-4 for the adapter, a few hundred to a couple of thousand steps. Save a checkpoint every few hundred and generate samples from each. The best checkpoint is almost never the last one.
- **Overfitting, what it looks like.** The trigger word starts reproducing specific training images. Backgrounds from the dataset appear in unrelated prompts. Prompts that used to work stop working. This is the same phenomenon as the memorisation point in Lab 01's denoise demo, just visible earlier.

### The honest political line

A LoRA is the technology that makes "train on one artist's work in an afternoon on a rented GPU" true. That is not an accident of the technique; it is what low rank adaptation is for. The room should train one and then be asked what they just did. Do not editorialise it in the slides, ask it as a question.

---

## 5. Questions to expect

**"Is a LoRA a copy of the images?"** No, it is a small update to weights. But it can memorise, especially with few images and many steps, and it can reproduce training images closely enough that the distinction stops mattering in practice. Both halves of that sentence are true.

**"Why does everything look grey and slightly hazy?"** Section 2, the terminal signal to noise problem, plus the VAE.

**"Can I stack LoRAs?"** Yes, they add. They also interfere; two strong style LoRAs usually make mud. Lower the weights.

**"Why does my LoRA break hands?"** It probably did not; the base model breaks hands. Check the base without the adapter before blaming the adapter. This is a good general habit: change one thing.

---

## 6. References

- Hu et al., *LoRA: Low-Rank Adaptation of Large Language Models*, 2021.
- Gal et al., *An Image Is Worth One Word* (textual inversion), 2022.
- Ruiz et al., *DreamBooth*, 2022.
- Lin et al., *Common Diffusion Noise Schedules and Sample Steps Are Flawed*, 2023, for the dark image problem.
- Rombach et al., 2022, week 1, for the autoencoder that colour passes through.
