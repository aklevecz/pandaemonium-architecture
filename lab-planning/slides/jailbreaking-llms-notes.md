# Jailbreaking open-weight LLMs: teaching notes

Speaker notes for [jailbreaking-llms.md](jailbreaking-llms.md), one heading per slide, in slide order. The deck was built as a claude.ai Slides artifact: https://claude.ai/artifact/SokBuqS1HgdxgAcpqDdgbX

## Jailbreaking open-weight LLMs

This talk covers weight-level jailbreaks: attacks that need the model file itself. Prompt-only attacks are Part 2. Everything here is about open-weight models, where the owner controls the weights.

## Two ways to break a model

Prompt attacks trick a model through its input. Weight attacks change the model, so they need the weights. Today is the weight column: abliteration (what Heretic does) and harmful fine-tuning.

## Once weights ship, the owner controls everything

With a hosted model, the provider sits between the user and the weights. With open weights, nobody does. Any safety behavior has to survive an owner who can inspect and edit every part of the model.

## Refusal is mediated by a single direction

Key finding: across 13 open chat models up to 72B, refusal behaves like one switch in the model’s internal activations (the residual stream, the running state passed between layers). Remove that one direction and the model complies; add it and the model refuses everything. The authors turned this into a rank-one weight edit, simpler than fine-tuning.

## How abliteration works

Step 4 is called orthogonalization: each weight matrix that writes into the residual stream is modified so its output has zero component along the refusal direction. It is a rank-one edit. No new data and no gradient steps, which is what separates it from an uncensored fine-tune. FailSpy’s abliterator library and mlabonne’s Hugging Face write-up popularized the technique after the Arditi et al. paper.

## Heretic automates the tuning

KL divergence measures how far the edited model’s outputs drift from the original. Low KL means the model is mostly unchanged apart from refusals. The README says MLP edits tend to do more damage than attention edits, which is why the two are tuned separately. Install is pip install heretic-llm; it runs fully automatically.

## Same refusal rate, less damage

All three abliterated versions get refusals from 97 to 3 out of 100 harmful prompts. The difference is collateral damage: Heretic’s KL divergence of 0.16 versus 1.04 and 0.45 for earlier hand-tuned abliterations. 1.04 / 0.16 is about 6.5. These are the author’s own numbers and may vary by hardware. The README also cites independent MMLU and GSM8K comparisons and says over 5,000 community models have been published with Heretic.

## Fine-tuning strips safety cheaply

Fine-tuning needs training data and compute; abliteration needs neither. Both are cheap. Qi et al. did this through OpenAI’s fine-tuning API, so it isn’t only an open-weight problem: any model that offers fine-tuning is exposed. Lermen et al. argue that fine-tuning risk should be part of the risk assessment before releasing weights.

## Safety alignment is often only a few tokens deep

Qi et al. call this “shallow safety alignment”: training mostly changes the probability of the opening tokens, like “I can’t help with that.” Get past those first tokens by any route and the model often continues normally. Their proposed fix is training the model to recover even after a harmful start, and constraining fine-tuning updates on the first tokens.

## Defenses under research

Circuit breakers target attacks at run time and were extended to multimodal models and agents. TAR targets the open-weight case directly: the TAR abstract says hundreds of steps in one version and thousands in another, so “hundreds” is the conservative figure. TAR’s maintainers flagged a data contamination issue and released a revised model, TAR-Bio-v2. Whether any safeguard can hold against a determined owner of the weights is still an open question.

## Why this matters

The release-decisions point follows Lermen et al., who argue fine-tuning risk belongs in the risk assessment before weights are released. The “judged as if it has none” framing is the presenter’s summary, not a quote. Heretic’s README says over 5,000 community models have been published with it, so this is not hypothetical.

## Prompt attacks hit the same switch

Bridge to Part 2. The weight view explains the prompt view: a successful prompt attack is one that pushes the model’s activations away from the refusal direction. Part 2 topics are placeholders until researched.

Wording caveat: Arditi et al. say their suffix analysis “is restricted to a single model and a single adversarial example” (Qwen 1.8B Chat). The slide’s general claim says more than that.

## Sources

All seven sources were checked against their arXiv, proceedings or GitHub pages when the deck was built (October 2026).
