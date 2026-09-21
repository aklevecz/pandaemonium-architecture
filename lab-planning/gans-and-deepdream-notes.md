# DeepDream and GANs: slide content and links

Written to be copied into Google Slides: each block below is one slide, with a
title, the text for the slide, links, and a note for you that does not go on the
slide. Every link was opened on 20 September 2026 and loads. Quotes from BigGAN
and the latent diffusion paper were checked against the copies on the course
site. Other dates, prices and names are from memory, so confirm any you put on a
slide.

The through-line: **three ways to get a picture out of a trained network.**

1. DeepDream (2015): change the picture until a classifier likes it.
2. GANs (2014 to 2021): train a forger against a critic, then draw in one pass.
3. Diffusion (2020 on): remove noise a little at a time.

The question to keep asking: **who is the judge?** A classifier, a discriminator,
or a noise-prediction score. Conditioning, in the other notes, is what happens
when the judge can read text.

---

## Part 1. DeepDream

### Slide: What does a classifier see?

- In 2015 image classifiers worked, and nobody could say what was inside them.
- Three Google engineers (Alexander Mordvintsev, Chris Olah, Mike Tyka) turned one
  around to find out.
- Normal training: keep the image fixed, adjust the network.
- DeepDream: keep the network fixed, adjust the image.

Link: Inceptionism, the original post (June 2015)
https://research.google/blog/inceptionism-going-deeper-into-neural-networks/

Note: this started as interpretability research, not art. The art was a side effect.

### Slide: Whatever you see, show me more of it

1. Show the network a photo.
2. Pick a layer. Ask: which features fired?
3. Nudge the pixels so those features fire harder.
4. Feed the result back in. Repeat.

- Low layers give strokes and textures. High layers give eyes, animals, buildings.
- It is a feedback loop on perception.

Links:
- Code, released July 2015: https://github.com/google/deepdream
- Try it in a browser: https://deepdreamgenerator.com/
- TensorFlow's walkthrough: https://www.tensorflow.org/tutorials/generative/deepdream

Note: connects to week 4, "Feedback." Same structure as a microphone next to a speaker.

### Slide: Why is it always dogs?

- The network was trained on ImageNet: 1,000 categories, about 120 of them dog breeds.
- It learned a great deal about dog faces, so dog faces are what it finds.
- The hallucination is a portrait of the training set.

Link: background and images https://en.wikipedia.org/wiki/DeepDream

Note: this is the same point as the pizza page. The "no prompt" run drew stock
photos of happy people for the same reason DeepDream drew dogs.

### Slide: Seeing faces where there are none

- DeepDream is not a generative model. It has no distribution to sample from. It
  can only amplify what a classifier already detects.
- Poliks and Trillo (week 1) call the aesthetic of this era "compulsive
  apophenia": seeing a face where it does not belong. Their footnote notes that
  deep learning keeps borrowing sleep metaphors: DeepDream, BigSleep.

Links:
- Feature Visualization (Olah et al., 2017), the careful version of the same idea,
  with interactive figures: https://distill.pub/2017/feature-visualization/
- Trevor Paglen, Adversarially Evolved Hallucinations (2017). He is a week 5
  author: https://paglen.studio/2020/04/09/hallucinations/

### Slide: Style transfer, the same trick pointed elsewhere

- Gatys, Ecker and Bethge, August 2015, two months after DeepDream.
- Optimize an image so its content matches one picture and its textures match another.
- By 2016 it was a phone app (Prisma). First time this research reached the public as a filter.

Link: A Neural Algorithm of Artistic Style https://arxiv.org/abs/1508.06576

---

## Part 2. GANs

### Slide: The forger and the detective

- Ian Goodfellow and colleagues, June 2014.
- Two networks trained against each other:
  - The **generator** turns random numbers into an image.
  - The **discriminator** sees real and generated images and says which is which.
- Each improves by beating the other.
- The generator never sees a real image. It only ever learns what fooled the critic.

Links:
- The paper: https://arxiv.org/abs/1406.2661
- Goodfellow's tutorial, readable: https://arxiv.org/abs/1701.00160
- Overview: https://en.wikipedia.org/wiki/Generative_adversarial_network

### Slide: Watch one train

- GAN Lab runs a tiny GAN in the browser. The green dots are real data, the purple
  dots are fakes, and the background is the discriminator's opinion.
- Watch for the moment the fakes pile onto one spot. That is mode collapse.

Link: https://poloclub.github.io/ganlab/

Note: best live demo for this section. Two minutes. Pick the "ring" distribution.

### Slide: Latent space

- The generator's input is a list of about a hundred random numbers, called z.
- Every z is an image. Nearby z, similar images. A line between two z is a morph.
- Directions have meanings. DCGAN (2015): man with glasses, minus man, plus woman,
  gives a woman with glasses.
- This is the same idea as an embedding (Lab 07), run in reverse: from vector to picture.

Link: DCGAN https://arxiv.org/abs/1511.06434

### Slide: Eight years, from smudges to faces

- 2014, GAN: blurry 32-pixel faces.
- 2015, DCGAN: bedrooms; latent arithmetic.
- 2017, pix2pix and CycleGAN: image in, image out. Horses to zebras.
- 2017, Progressive GAN: 1024-pixel faces.
- 2018, BigGAN: all of ImageNet, class-conditional.
- 2018 to 2019, StyleGAN: faces indistinguishable from photographs.
- February 2019: thispersondoesnotexist.com.
- Late 2017: the word "deepfake" appears.

Links:
- pix2pix: https://phillipi.github.io/pix2pix/
- CycleGAN: https://junyanz.github.io/CycleGAN/
- Progressive GAN: https://arxiv.org/abs/1710.10196
- BigGAN (on the course site too): https://arxiv.org/abs/1809.11096
- StyleGAN: https://arxiv.org/abs/1812.04948
- This Person Does Not Exist: https://thispersondoesnotexist.com/

Note: reload thispersondoesnotexist a few times in the room. Then ask what is
wrong with the backgrounds, the ears, the second person at the edge of the frame.

### Slide: Mode collapse

- The generator is rewarded for fooling the critic, not for covering everything real.
- So it can settle on a few images that work and make only those.
- A GAN has no way to say how likely an image is, so nothing inside it can notice.

Note: compare the pizza page. 71% of 1,000 "pizza" images were the same image by
our categories. Different cause (that model is not a GAN, and it was tuned to
please people), same shape: variety is the first thing optimization spends.

### Slide: The truncation trick

- BigGAN (Brock et al., 2018): sample z from a narrower range and the images look
  better and vary less.
- In their words, it "leads to improvement in individual sample quality at the cost
  of reduction in overall sample variety."
- That trade is the ancestor of the guidance scale, and of temperature in Lab 01.

Link: https://arxiv.org/abs/1809.11096

### Slide: GAN art, 2017 to 2021

- **Edmond de Belamy** (Obvious, 2018). Sold at Christie's in October 2018 for
  $432,500 against an estimate under $10,000. The collective used code and a
  trained model published by Robbie Barrat, then 19, who was not credited or paid.
  The argument about authorship started here.
- **Anna Ridler, Mosaic Virus** (2018 to 2019). She photographed and labeled 10,000
  tulips by hand. The dataset is the artwork; the GAN's tulips change their stripes
  with the price of bitcoin.
- **Memo Akten, Learning to See** (2017). A network trained only on waves, or only
  on flowers, shown a live camera feed. It can only see what it was trained on.
- **Refik Anadol, Machine Hallucination** (2019). StyleGAN trained on millions of
  photographs of New York, shown at architectural scale.
- **Mario Klingemann, Memories of Passersby I** (2019). A machine that generates
  portraits endlessly, sold at Sotheby's.
- **Artbreeder** (Joel Simon, 2018). Latent-space mixing as a social tool: breed
  images together.

Links:
- Christie's on Belamy: https://www.christies.com/en/stories/a-collaboration-between-two-artists-one-human-one-a-machine-0cd01f4e232f4279a525a446d60d4cd1
- Belamy, with the dispute: https://en.wikipedia.org/wiki/Edmond_de_Belamy
- Robbie Barrat: https://robbiebarrat.github.io/
- Anna Ridler, Mosaic Virus: https://annaridler.com/mosaic-virus
- Memo Akten, Learning to See: https://www.memo.tv/works/learning-to-see/
- Refik Anadol, Machine Hallucination: https://refikanadol.com/works/machine-hallucination/
- Mario Klingemann: https://quasimondo.com/
- Artbreeder: https://www.artbreeder.com/

Note: Ridler and Akten are the two to dwell on. Both make the training set the
subject, which is the course's argument. Belamy is the one students have heard of.

### Slide: Opening the box

- GAN Dissection (MIT, 2018) found single units inside a GAN that control trees,
  doors, or windows. Switch one off and the trees vanish from the scene.
- The network was never told what a tree is.

Link: https://gandissect.csail.mit.edu/

### Slide: Why diffusion took over

- GANs are fast (one pass) and sharp, but:
  - training is unstable,
  - they collapse onto a few modes,
  - each one only covers a narrow subject (faces, bedrooms, cats),
  - they take text poorly.
- The latent diffusion paper says GAN results are "mostly confined to data with
  comparably limited variability."
- 2021: a paper titled Diffusion Models Beat GANs on Image Synthesis. By 2022,
  text-to-image is all diffusion.

### Slide: GANs did not go away

- Stable Diffusion's own autoencoder is trained with "a patch-based adversarial
  objective." A small critic keeps its output sharp.
- Upscalers (ESRGAN) are GANs.
- Fast versions of diffusion models (one to four steps) are made by distilling
  them with an adversarial loss. That is Lab 08.

---

## The thread, in one slide

| | Judge | How an image is made | What goes wrong |
|---|---|---|---|
| DeepDream (2015) | An image classifier | Nudge pixels until the judge fires harder | Dogs and eyes everywhere |
| GAN (2014 to 2021) | A discriminator, trained alongside | One pass from random numbers | Mode collapse, narrow subjects |
| CLIP guidance (2021) | CLIP, which reads text | Nudge an image toward a caption | Texture soup, words appearing in the image |
| Diffusion with guidance (2021 on) | The model's own with-prompt and without-prompt predictions | Denoise step by step | Burnt, uniform images at high guidance |

VQGAN+CLIP in 2021 is DeepDream with a judge that can read. Classifier-free
guidance is the same move with the judge folded into the model. That is the bridge
into the conditioning notes.
