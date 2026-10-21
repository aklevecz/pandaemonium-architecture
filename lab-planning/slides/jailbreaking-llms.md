---
title: Jailbreaking open-weight LLMs
draft: true
blurb: How refusal lives in the weights, and how tools like Heretic remove it.
---

@title
eyebrow: Part 1 · Weight-level attacks
# Jailbreaking open-weight LLMs

How refusal lives in the weights, and how tools like Heretic remove it.

---

@list
## Two ways to break a model

- Prompt attacks (Part 2, black-box): need a chat box or API, change the input, work on closed and open models.
- Weight attacks (today, white-box): need the model file, change the model itself, work on open-weight models.

---

@prose
## Once weights ship, the owner controls everything

Activations: read and edit what any layer computes.

Weights: edit matrices directly, or fine-tune on new data.

Decoding: prefill the answer, change sampling, drop the system prompt.

Safety training is just more weights.

---

@list
## Refusal is mediated by a single direction

- 13 open chat models tested, up to 72B parameters.
- Erase it: the model stops refusing harmful requests.
- Add it: the model refuses even harmless requests.

Source: Arditi et al., “Refusal in Language Models Is Mediated by a Single Direction,” NeurIPS 2024. arXiv:2406.11717

---

@list
## How abliteration works

1. Collect two prompt sets: harmful instructions and harmless ones.
2. Record activations: the model’s internal state at each layer, for both sets.
3. Subtract the means: mean(harmful) − mean(harmless) = the refusal direction.
4. Project it out of the weights: edit matrices so they can’t write that direction. No training.

Sources: Arditi et al. 2024; Heretic README. “Abliteration” is the community name for this edit.

---

@list
## Heretic automates the tuning

- Search: Optuna’s TPE optimizer tries settings and learns from each run.
- Goal: fewest refusals with the least drift from the original model (KL divergence).
- Edits: attention output and MLP down-projection, tuned separately.
- Shape: a per-layer weight curve (peak, peak position, minimum, spread).
- Cost: about 20–30 minutes for a 4B model on an RTX 3090.

Source: github.com/p-e-w/heretic (AGPL-3.0). Timing is the author’s figure for Qwen3-4B-Instruct-2507.

---

@list
## Same refusal rate, less damage

- Gemma-3-12b-it original: 97/100 refusals, KL 0.
- mlabonne v2: 3/100 refusals, KL 1.04.
- huihui-ai: 3/100 refusals, KL 0.45.
- Heretic: 3/100 refusals, KL 0.16. About 6.5× less drift than mlabonne v2.

Author-reported in the Heretic README; not independently reproduced. Lower KL = closer to the original model.

---

@list
## Fine-tuning strips safety cheaply

- 10 training examples, under $0.20 in API fees, broke GPT-3.5 Turbo’s safety. Benign fine-tuning degraded it too, less severely. (Qi et al., ICLR 2024)
- ~1% refusal rate: Llama 2-Chat 70B after QLoRA on one GPU for under $200, with general capability kept. (Lermen, Rogers-Smith & Ladish, 2023)

Sources: arXiv:2310.03693; arXiv:2310.20624. The $0.20 figure reflects 2023 OpenAI pricing.

---

@statement
Safety alignment is often only a few tokens deep.
note: Qi et al., ICLR 2025 Outstanding Paper. Alignment mostly shapes the first few words of a reply. That one weakness explains why adversarial suffixes, prefilling, decoding tweaks and fine-tuning all work.

---

@list
## Defenses under research

- Circuit breakers (vs. prompt attacks): interrupt the internal representations that produce harmful output, instead of training refusals. Zou et al., NeurIPS 2024.
- Tamper-resistant training (vs. weight tampering): TAR trains safeguards to survive hundreds of fine-tuning steps. Tamirisa et al., ICLR 2025.
- Deeper alignment (vs. both): train recovery past the first tokens; limit how fine-tuning moves them. Qi et al., ICLR 2025.

---

@list
## Why this matters

- Interpretability: refusal turned out to be a simple, findable feature. That is a research result about how models work, not only a hack.
- Release decisions: if safety can be removed in minutes, a model’s risk should be judged as if it has none once the weights are public.
- Open question: can any safeguard on open weights survive a motivated owner? TAR and deeper alignment are early attempts.

---

@list
## Prompt attacks hit the same switch

Arditi et al. found adversarial suffixes work by suppressing the same refusal direction that abliteration removes.

- Adversarial suffixes
- Attacker-LLM loops
- Many-shot prompting
- Prefilling

---

@list
## Sources

1. Arditi et al., “Refusal in Language Models Is Mediated by a Single Direction,” NeurIPS 2024. arXiv:2406.11717
2. Weidmann, Heretic: fully automatic censorship removal for language models. github.com/p-e-w/heretic
3. Qi et al., “Fine-tuning Aligned Language Models Compromises Safety, Even When Users Do Not Intend To!,” ICLR 2024. arXiv:2310.03693
4. Lermen, Rogers-Smith & Ladish, “LoRA Fine-tuning Efficiently Undoes Safety Training in Llama 2-Chat 70B,” 2023. arXiv:2310.20624
5. Qi et al., “Safety Alignment Should Be Made More Than Just a Few Tokens Deep,” ICLR 2025
6. Zou et al., “Improving Alignment and Robustness with Circuit Breakers,” NeurIPS 2024. arXiv:2406.04313
7. Tamirisa et al., “Tamper-Resistant Safeguards for Open-Weight LLMs,” ICLR 2025. arXiv:2408.00761
