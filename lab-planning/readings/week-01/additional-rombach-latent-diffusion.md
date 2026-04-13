# Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser, Björn Ommer, *High-Resolution Image Synthesis with Latent Diffusion Models*

**Week:** 1 (Additional / Primary Documents)
**File:** `markdown/additional_reading_primary_documents/Robin Rombach, et al., High-Resolution Image Synthesis with Latent Diffusion Models.md`
**Length:** 1225 lines (digest based on Abstract, Introduction, Sections 2–3, Limitations & Societal Impact, Conclusion)

## Summary

This is the paper behind Stable Diffusion. The authors argue that previous diffusion models were strangled by operating directly in pixel space — training takes hundreds of GPU days because the loss is being computed on millions of imperceptible details. Their fix: train an autoencoder once to compress images into a perceptually-equivalent latent space, then do the diffusion (and the cross-attention conditioning that lets you steer with text or layouts) in that smaller space. The result is dramatically cheaper training and inference at near-equivalent quality — and a model class that was small enough to release publicly, which is what made the consumer text-to-image wave possible.

## Key quotes

- *"By decomposing the image formation process into a sequential application of denoising autoencoders, diffusion models (DMs) achieve state-of-the-art synthesis results on image data and beyond... However, since these models typically operate directly in pixel space, optimization of powerful DMs often consumes hundreds of GPU days and inference is expensive due to sequential evaluations."* (line 13)
- *"As an example, training the most powerful DMs often takes hundreds of GPU days (e.g. 150 - 1000 V100 days in [15]) and repeated evaluations on a noisy version of the input space render also inference expensive"* (line 23)
- *"This has two consequences for the research community and users in general: Firstly, training such a model requires massive computational resources only available to a small fraction of the field, and leaves a huge carbon footprint... Secondly, evaluating an already trained model is also expensive in time and memory"* (line 27)
- *"As with any likelihood-based model, learning can be roughly divided into two stages: First is a perceptual compression stage which removes high-frequency details but still learns little semantic variation. In the second stage, the actual generative model learns the semantic and conceptual composition of the data (semantic compression)."* (line 31)
- *"Generative models for media like imagery are a double-edged sword... Finally, deep learning modules tend to reproduce or exacerbate biases that are already present in the data [22, 38, 91]."* (lines 336, 338)

## Why it's in the course

Latent diffusion is the apparatus that almost any "AI image" generated since late 2022 has actually passed through. Reading the original paper de-magicks the system: students see the engineering rationale (compute cost, perceptual vs. semantic compression) and the explicit acknowledgment that the model reproduces dataset bias.

## Relevance to the lab

Apparatus: the paper itself names what the apparatus decided — the LAION-trained autoencoder fixes the "perceptually equivalent" space before any prompt is ever entered; cross-attention is the only channel through which text reaches image; bias is acknowledged as inherited rather than designed. Loading the machine: the conditioning mechanism (text encoders, semantic maps, layouts) is precisely the surface where artistic choice meets the apparatus, which makes this a foundational reading for any text-to-image lab exercise.
