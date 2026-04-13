# Ian Goodfellow et al., *Generative Adversarial Nets*

**Week:** 8 (Additional / Primary Documents)
**File:** `markdown/additional_reading_primary_documents/Ian Goodfellow, et al., Generative Adversarial Nets.md`
**Length:** 285 lines

## Summary

Foundational 2014 paper introducing GANs — a novel framework for training generative models through adversarial dynamics: a generator *G* learns to fool a discriminator *D* into accepting fake samples as real, while *D* improves at detection. The paper proves that under ideal conditions, the generator learns the data distribution. Practical experiments on MNIST, CIFAR-10, and other datasets demonstrate competitive performance. The framework sidesteps many computational difficulties of previous generative approaches and requires only standard backpropagation.

## Key quotes

- *"The generative model can be thought of as analogous to a team of counterfeiters, trying to produce fake currency and use it without detection, while the discriminative model is analogous to the police, trying to detect the counterfeit currency. Competition in this game drives both teams to improve their methods until the counterfeits are indistinguishable from the genuine articles."* (line 15)
- *"Theorem 1. The global minimum of the virtual training criterion C(G) is achieved if and only if p_g = p_data. At that point, C(G) achieves the value −log 4."* (line 111)

## Why it's in the course

Week 8 ("Art as Abstract Machine") seminar explicitly uses GANs — "*Police and Thieves: Generative Adversarial Nets* … GANs to diffusion models" — paired with Zepke on Deleuze and Fogg on persuasion. The GAN paper is the technical anchor for the seminar's discussion of adversarial generation as both computational technique and aesthetic form.

## Relevance to the lab

**Apparatus** and **Creative Act.** GANs embody a specific cut: generation is adversarial; novelty emerges from a zero-sum game. The two-pole feedback loop between generator and discriminator mirrors Duchamp's creative act as spectator-completion. **Reversal**: flip which model is "real" and which is "fake"; or train a student's work to fail the discriminator on purpose.
