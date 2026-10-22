---
title: Jailbreaking open-weight LLMs
draft: true
blurb: How refusal lives in the weights, how tools like Heretic remove it, and how prompts route around it.
---

@title
eyebrow: Part 1 · Weight attacks · Part 2 · Prompt attacks
# Jailbreaking open-weight LLMs

How refusal lives in the weights, how tools like Heretic remove it, and how prompts route around it.

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

@title
eyebrow: Part 2 · Prompt attacks
# Jailbreaking through the input

No weights, no gradients on the target. Just text, sent through the same box everyone else uses.

---

@list
## Why safety training fails

- Competing objectives: being helpful and being safe pull against each other. Role-play, or telling the model how to begin its answer, sets one against the other.
- Mismatched generalization: safety training covers less ground than the model's abilities. A request in Base64 or a low-resource language can slip past refusals the model would give in English.
- 79% of unsafe AdvBench requests got through on GPT-4 once translated into low-resource languages like Zulu, Scots Gaelic and Hmong. High- and mid-resource languages did much worse.

Sources: Wei, Haghtalab & Steinhardt, NeurIPS 2023, arXiv:2307.02483; Yong, Menghini & Bach, 2023, arXiv:2310.02446.

---

@list
## Adversarial suffixes are found by search

1. Fix a target: the model's reply should begin "Sure, here is…".
2. Use gradients to rank, for each suffix position, the token swaps most likely to make that opening more probable.
3. Try a batch of single swaps; keep the best one. Repeat for hundreds of steps.
4. Optimize across many requests and models at once to get one universal suffix.

Source: Zou et al., “Universal and Transferable Adversarial Attacks on Aligned Language Models,” 2023. arXiv:2307.15043. The method is called GCG (Greedy Coordinate Gradient).

---

@list
## Optimized on open models, used on closed ones

- Suffixes were trained only on Vicuna-7B and 13B, open models whose gradients you can compute.
- They transferred to the public interfaces of ChatGPT, Bard and Claude, and to LLaMA-2-Chat, Pythia and Falcon.
- An open-weight model becomes a workbench for attacking closed ones. The weights from Part 1 matter even when the target never ships them.

Source: Zou et al. 2023. Most published suffixes stopped working once providers patched against them.

---

@list
## Gibberish is easy to catch, so attacks learned to read

- Perplexity filtering: GCG suffixes look nothing like normal text, so a language model scoring how surprising the input is flags them. Paraphrasing the input also scrambles them. (Jain et al. 2023)
- AutoDAN: a genetic algorithm evolves jailbreak prompts that stay readable, and gets past perplexity filters. (Liu et al., ICLR 2024)
- Each defense defines the next attack's target.

Sources: arXiv:2309.00614; arXiv:2310.04451.

---

@list
## LLMs that jailbreak LLMs

- PAIR: an attacker model writes a prompt, reads the target's refusal, rewrites, and tries again. Often fewer than twenty queries, against GPT-3.5/4, Vicuna and Gemini.
- TAP: the same loop as a tree search, pruning branches that drift off-topic before they are sent.
- Crescendo: a multi-turn conversation that starts harmless and escalates by building on the model's own earlier answers.

Sources: Chao et al. 2023, arXiv:2310.08419; Mehrotra et al., NeurIPS 2024, arXiv:2312.02119; Russinovich, Salem & Eldan, USENIX Security 2025, arXiv:2404.01833.

---

@list
## Persuasion is social engineering

- Zeng et al. turned a taxonomy of persuasion techniques from social science into persuasive adversarial prompts: appeals to authority, emotion, reciprocity.
- 92%+ attack success on Llama 2-7b Chat, GPT-3.5 and GPT-4, across 10 trials.
- The model is attacked the way a person is. Compare Hadnagy's princess tea party.

Source: Zeng et al., “How Johnny Can Persuade LLMs to Jailbreak Them,” ACL 2024. arXiv:2401.06373

---

@list
## Long contexts and prefilled answers

- Many-shot: hundreds of fake dialogues in one prompt, each showing an assistant complying, then the real question. Harmful answers rise with the shot count along a power law (tested up to 256 shots), and larger models are more susceptible.
- Prefilling: some APIs let you write the start of the model's reply. Andriushchenko et al. report 100% success on every Claude model they tested this way.
- Both are Part 1's “few tokens deep” problem, reached through the input instead of the weights.

Sources: Anil et al., “Many-shot Jailbreaking,” Anthropic, April 2024; Andriushchenko, Croce & Flammarion, ICLR 2025, arXiv:2404.02151.

---

@list
## When the prompt isn't typed by the user

- Indirect prompt injection: the attacker hides instructions in data an LLM app will later read: a web page, an email, a file.
- Demonstrated against Bing's GPT-4 chat: a page the model retrieved could take over the conversation.
- Every agent harness is exposed. Codec from Lab 02 reads files and runs tools; any text it reads is a possible instruction.

Source: Greshake et al., “Not what you've signed up for,” 2023. arXiv:2302.12173

---

@demo
## Your turn: break an agent

Lakera's Agent Breaker is a set of deliberately vulnerable AI apps. Each attempt is scored 0–100; 75 unlocks the next level. 20 minutes.

[Open Agent Breaker](https://play.lakera.ai/agent-breaker)

1. Pick one app you attack by typing, such as Cycling Coach: extract its system prompt.
2. Pick one you attack through content it reads, such as Trippy Planner: a planted web page.
3. For each attempt that scores, write one line on what worked.
4. Label it: competing objectives, mismatched generalization, or injection?

---

@list
## Defenses against prompt attacks

- Filter the input: perplexity checks, paraphrasing, or a trained classifier that reads the prompt before the model does. A classifier cut many-shot success from 61% to 2% in one Anthropic test.
- Randomize: SmoothLLM perturbs several copies of the prompt and aggregates the answers; optimized attacks break when characters change.
- Constitutional Classifiers: input and output classifiers trained from a written list of what is allowed. Over 3,000 hours of red teaming found no universal jailbreak of an early version; cost was +0.38% refusals and 23.7% more compute.
- Circuit breakers (Part 1) act on the representations instead of the text.

Sources: Robey et al. 2023, arXiv:2310.03684; Sharma et al. 2025, arXiv:2501.18837.

---

@statement
A jailbreak finds the gap between what a model can do and what it was trained to refuse.
note: Presenter's synthesis of Wei et al. 2023. Weight attacks close the gap by deleting the refusal; prompt attacks find the inputs where it never reached.

---

@list
## Readings

- Part 1 · Arditi et al., “Refusal in LLMs is mediated by a single direction,” LessWrong, April 2024. The blog version of the paper.
- Part 1 · Labonne, “Uncensor any LLM with abliteration,” Hugging Face blog, June 2024. Step-by-step, with code.
- Part 2 · Wei, Haghtalab & Steinhardt, “Jailbroken: How Does LLM Safety Training Fail?,” NeurIPS 2023. The frame for Part 2; sections 1–3.
- Part 2 · Anthropic, “Many-shot jailbreaking,” April 2024. A short research post, with the defense that worked.
- Part 2 · Zeng et al., “How Johnny Can Persuade LLMs to Jailbreak Them,” ACL 2024. Persuasion as an attack; pairs with Hadnagy.
- Part 2 · Willison, “Prompt injection attacks against GPT-3,” September 2022. The post that named the attack.

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
8. Wei, Haghtalab & Steinhardt, “Jailbroken: How Does LLM Safety Training Fail?,” NeurIPS 2023. arXiv:2307.02483
9. Yong, Menghini & Bach, “Low-Resource Languages Jailbreak GPT-4,” 2023. arXiv:2310.02446
10. Zou et al., “Universal and Transferable Adversarial Attacks on Aligned Language Models,” 2023. arXiv:2307.15043
11. Jain et al., “Baseline Defenses for Adversarial Attacks Against Aligned Language Models,” 2023. arXiv:2309.00614
12. Liu et al., “AutoDAN: Generating Stealthy Jailbreak Prompts on Aligned Large Language Models,” ICLR 2024. arXiv:2310.04451
13. Chao et al., “Jailbreaking Black Box Large Language Models in Twenty Queries,” 2023. arXiv:2310.08419
14. Mehrotra et al., “Tree of Attacks: Jailbreaking Black-Box LLMs Automatically,” NeurIPS 2024. arXiv:2312.02119
15. Russinovich, Salem & Eldan, “Great, Now Write an Article About That: The Crescendo Multi-Turn LLM Jailbreak Attack,” USENIX Security 2025. arXiv:2404.01833
16. Zeng et al., “How Johnny Can Persuade LLMs to Jailbreak Them,” ACL 2024. arXiv:2401.06373
17. Anil et al., “Many-shot Jailbreaking,” Anthropic, 2024. anthropic.com/research/many-shot-jailbreaking
18. Andriushchenko, Croce & Flammarion, “Jailbreaking Leading Safety-Aligned LLMs with Simple Adaptive Attacks,” ICLR 2025. arXiv:2404.02151
19. Greshake et al., “Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection,” 2023. arXiv:2302.12173
20. Robey et al., “SmoothLLM: Defending Large Language Models Against Jailbreaking Attacks,” 2023. arXiv:2310.03684
21. Sharma et al., “Constitutional Classifiers: Defending against Universal Jailbreaks across Thousands of Hours of Red Teaming,” 2025. arXiv:2501.18837
