# Lab 08 notes: Fool me only once shame on you, fool me into randomness great job

Deck: `/lab/8`. Lab items: GANs, distillation.

These two topics look unrelated and are not. The technique that makes image generation fast enough for the realtime tools from Lab 02 is distillation with an adversarial loss, which is a GAN discriminator doing a job inside a diffusion pipeline. The session can end by closing that loop.

---

## 0. The frame in one paragraph

A generative adversarial network trains two networks against each other: one making fakes, one calling them out. Neither is told what a good image is; the standard comes from the competition. Distillation is the opposite arrangement: a large trained model teaches a small one by handing over not its answers but its uncertainty. One is a fight, the other is inheritance, and the current generation of fast image models uses both at once.

---

## 1. GANs

Goodfellow et al., 2014. The origin story, that it was worked out in an argument in a bar in Montreal and implemented that night, is true enough to tell and gets attention.

### The setup

- **Generator `G`** takes a random vector `z` and outputs an image. It has never seen the training set.
- **Discriminator `D`** takes an image and outputs the probability that it came from the real data rather than from `G`.

They are trained on opposite objectives. `D` is trained to be right. `G` is trained to make `D` wrong. Formally it is a minimax game on a single value function:

```
min_G max_D  E[log D(x)] + E[log(1 - D(G(z)))]
```

At the theoretical optimum, `G` reproduces the data distribution and `D` outputs one half everywhere, having nothing left to detect.

### The point worth making in an art school

There is no loss function describing what a face looks like. Nobody wrote down the criteria. The criteria are whatever the discriminator currently notices, and they change every step as the discriminator learns. It is a moving standard produced by opposition, which is a genuinely different thing from the fixed objective in Lab 04, and it is why GANs are the model family that most invites the police and thieves framing.

### Why they are hard to train

Worth covering, because the failure modes are the interesting part:

- **Mode collapse.** `G` finds one output that reliably fools `D` and produces variations of only that. It has won the game and lost the task. The objective never asked for variety.
- **Vanishing gradients.** If `D` gets too good too fast, it rejects everything with total confidence and `G` receives no useful signal. The standard patch is the non saturating loss, training `G` to maximise `log D(G(z))` instead of minimising `log(1 - D(G(z)))`.
- **No convergence guarantee.** The two networks can cycle indefinitely. There is no loss curve that tells you it is working, which is why GAN papers are full of pictures rather than numbers.
- **No usable likelihood.** You cannot ask a GAN how probable an image is, so evaluation depends on proxy metrics like FID, which are themselves contested.

### The lineage, briefly

- **DCGAN** (Radford et al., 2015): convolutional architecture, the first version that reliably produced recognisable images.
- **WGAN** (Arjovsky et al., 2017): replaces the objective with a Wasserstein distance and makes training far more stable.
- **StyleGAN** (Karras et al., 2018, 2019): the mapping network turns `z` into an intermediate space `w` that is injected at every layer. This is what made style mixing and the smooth interpolations possible, and it is why every "this person does not exist" image looks the way it does. The truncation trick trades diversity for quality by pulling `w` toward the average, which is exactly the same tradeoff as temperature in Lab 01.
- **BigGAN** (Brock et al., 2018): scale plus class conditioning.

### Why diffusion won, and why GANs came back

Diffusion models cover the whole data distribution rather than collapsing to part of it, train with a stable objective, and scale predictably. By 2022 they had taken over image generation. But diffusion is slow, because it runs the network dozens of times per image, and that is where the discriminator returns. Section 3.

---

## 2. Distillation

Hinton, Vinyals and Dean, 2015, building on Buciluă et al., 2006.

### The idea

Train a big model. Then train a small model to imitate not the big model's answers but its full output distribution. The insight is in what the distribution carries: a classifier shown a picture of a dog might give dog 0.9, wolf 0.08, cat 0.001, car 0.0000001. The hard label says only "dog". The soft distribution says a dog is more like a wolf than a cat and nothing like a car. Hinton called that dark knowledge, and the student can learn it in far fewer examples than the teacher needed.

### Temperature, and a warning about the word

The soft targets are sharpened or flattened by a temperature in the softmax, exactly the same operation as the sampling temperature from Lab 01. It is not the same use. In Lab 01 the temperature shaped a draw at generation time. Here it shapes a training target, and typical values are 2 to 10, far above generation values. Flag this explicitly, because the shared name causes real confusion.

### Why it matters outside the lab

Every small fast model you can run on a laptop or phone is downstream of some larger model. Distillation is also how capability moves between organisations: if you can query a model, you can train a student on its outputs, which is why terms of service forbid it and why it happens anyway. That is a live legal and political question and it belongs in the seminar half.

---

## 3. Where the two meet: fast diffusion

This is the payoff, and it explains something the room already touched in Lab 02.

A standard diffusion model needs 20 to 50 network evaluations per image. Krea's realtime canvas needs one to four. The gap was closed in three steps:

- **Progressive distillation** (Salimans and Ho, 2022). Train a student to take one step that matches two of the teacher's. Halve the steps. Repeat. 1024 becomes 512 becomes 256, down to single digits.
- **Consistency models** (Song et al., 2023). Train a model so that every point along a noise trajectory maps directly to the same endpoint. That makes one step generation possible in principle. Latent consistency models applied this to Stable Diffusion, which is what put realtime tools in browsers in late 2023.
- **Adversarial diffusion distillation** (SDXL Turbo, 2023). Add a discriminator to the distillation loss, because pure distillation at one step produces blurry results for exactly the reason in Lab 04: an averaged prediction under a squared error loss is blurry. The discriminator penalises blur because blur is detectable. A GAN component was bolted onto a diffusion model to fix an artefact of the loss function.

**What is lost**, and this is the thing to make the room see rather than tell them: heavily distilled models produce less variety per seed. Run the same prompt with ten seeds on a full model and on a turbo model, side by side. The turbo grid is more uniform. Speed was paid for with diversity, and no interface mentions this.

---

## 4. The seminar connection

The week is police and thieves. The technical fact underneath: the same architecture is a generator and a detector, trained together, and a better detector directly produces a better forger. Deepfake detection is not a defence that can win permanently, because every detector is a training signal for the next generator. That is a structural claim about the technology, and it is defensible without any rhetoric attached.

---

## 5. Questions to expect

**"Are GANs dead?"** For standalone image generation, largely superseded. As a component, the adversarial loss is in current production models.

**"Is a distilled model worse?"** On a single output, often barely distinguishable. Across many outputs, less diverse. The benchmark for these things reports quality, not variety.

**"Can you detect generated images?"** Sometimes, briefly, until the detector is trained against. Provenance approaches like C2PA signing try to attack the problem from the other end, by certifying origin instead of detecting fakery.

**"Why does the discriminator get thrown away?"** It only exists to provide a gradient. Though it is worth noting that a trained discriminator is a detector, and that people keep them.

---

## 6. References

- Goodfellow et al., *Generative Adversarial Nets*, 2014. Assigned this week.
- Brock, Donahue and Simonyan, *Large Scale GAN Training for High Fidelity Natural Image Synthesis*, 2018. Assigned this week.
- Karras, Laine and Aila, *A Style-Based Generator Architecture for GANs*, 2019.
- Hinton, Vinyals and Dean, *Distilling the Knowledge in a Neural Network*, 2015.
- Salimans and Ho, *Progressive Distillation for Fast Sampling of Diffusion Models*, 2022.
- Song, Dhariwal, Chen and Sutskever, *Consistency Models*, 2023.
- Sauer et al., *Adversarial Diffusion Distillation*, 2023.
