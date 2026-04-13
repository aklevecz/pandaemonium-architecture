# Andrew Brock, Jeff Donahue, Karen Simonyan, *Large Scale GAN Training for High Fidelity Natural Image Synthesis*

**Week:** 8 (Additional / Primary Documents)
**File:** `markdown/additional_reading_primary_documents/Andrew Brock, et al., LARGE SCALE GAN TRAINING FOR HIGH FIDELITY NATURAL IMAGE SYNTHESIS.md`
**Length:** 760 lines (digest based on Abstract, Sections 1–5, Conclusion)

## Summary

This is the BigGAN paper (ICLR 2019) — DeepMind's demonstration that scaling existing GAN architectures by 2–4x parameters and 8x batch size on Google TPU pods radically improves class-conditional ImageNet synthesis. The authors introduce the "truncation trick" (sample from a truncated normal at inference to trade variety for fidelity), and find that large-scale GAN training is unstable in characteristic ways tied to the singular-value spectra of weight matrices. Stability and performance pull against each other: heavy regularization stabilizes training but tanks Inception Score, so the authors instead let collapse happen and stop early.

## Key quotes

- *"Despite recent progress in generative image modeling, successfully generating high-resolution, diverse samples from complex datasets such as ImageNet remains an elusive goal."* (line 9)
- *"We demonstrate that GANs benefit dramatically from scaling, and train models with two to four times as many parameters and eight times the batch size compared to prior art."* (line 19)
- *"We call this the Truncation Trick: truncating a z vector by resampling the values with magnitude above a chosen threshold leads to improvement in individual sample quality at the cost of reduction in overall sample variety."* (line 105)
- *"While the training accuracy is consistently above 98%, the validation accuracy falls in the range of 50-55%, no better than random guessing... This confirms that D is indeed memorizing the training set; we deem this in line with D's role, which is not explicitly to generalize, but to distill the training data and provide a useful learning signal for G."* (line 165)
- *"It is possible to enforce stability by strongly constraining D, but doing so incurs a dramatic cost in performance. With current techniques, better final performance can be achieved by relaxing this conditioning and allowing collapse to occur at the later stages of training."* (line 190)

## Why it's in the course

BigGAN is the canonical "throw compute at the GAN" paper and the prehistory of every present-day generative-image deployment. It crystallizes the moment when image synthesis became a function of TPU access rather than algorithmic insight, and it makes explicit several aesthetic-political decisions (truncation, discriminator memorization, controlled instability) that get hidden inside later product-grade systems.

## Relevance to the lab

Apparatus: the paper is a clean specimen for naming what the tool decided before students arrive — the ImageNet class taxonomy, the dog-heavy training distribution (line 229: dogs easier than crowds), the truncation knob that *"allows fine-grained, post-hoc selection of the trade-off between sample quality and variety"* (line 107), and the discriminator's role as memorizer rather than generalizer. Loading the machine: the truncation trick is itself a "what do you feed the latent" choice that students can manipulate.
