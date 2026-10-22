# Jailbreaking open-weight LLMs: teaching notes

Speaker notes for [jailbreaking-llms.md](jailbreaking-llms.md), one heading per slide, in slide order. The deck was built as a claude.ai Slides artifact, which has Part 2 as of October 21, 2026: https://claude.ai/artifact/SokBuqS1HgdxgAcpqDdgbX

## Jailbreaking open-weight LLMs

Part 1 covers weight-level jailbreaks: attacks that need the model file itself, so it is about open-weight models, where the owner controls the weights. Part 2 covers prompt attacks, which need only an input box and work on closed models too.

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

Bridge to Part 2. The weight view explains the prompt view: a successful prompt attack is one that pushes the model’s activations away from the refusal direction. Each of the four listed attacks gets its own slide in Part 2.

Wording caveat: Arditi et al. say their suffix analysis “is restricted to a single model and a single adversarial example” (Qwen 1.8B Chat). The slide’s general claim says more than that.

## Jailbreaking through the input

Part 2 title. Everything from here on works without the weights, which is why it applies to hosted models too. The one exception is GCG, which needs an open model to compute gradients on, then carries the result over to a closed one.

## Why safety training fails

Wei et al.’s two failure modes are the frame for the rest of Part 2; come back to them on each slide. Competing objectives: the model was trained both to follow instructions and to refuse, so an instruction like “begin your reply with ‘Absolutely’” or a role-play frame makes them fight. Mismatched generalization: pretraining taught the model Base64 and hundreds of languages, but safety training mostly happened in plain English, so the refusal doesn’t follow the request into those domains. The 79% figure is from Yong et al.’s abstract, on AdvBench with GPT-4; the abstract gives no English baseline, only that high- and mid-resource languages scored significantly lower.

## Adversarial suffixes are found by search

This is the gibberish-suffix attack. The target string “Sure, here is…” connects back to “few tokens deep”: GCG only has to win the first few tokens, and the model tends to continue on its own. Step 2 is why it needs white-box access: gradients with respect to the input tokens. Avoid showing a working suffix on screen; the published examples from the paper are patched on current frontier models, but the point is the method, not the string.

## Optimized on open models, used on closed ones

The transfer claim is from Zou et al.’s abstract: suffixes trained on Vicuna-7B/13B induced objectionable content in the public interfaces of ChatGPT, Bard and Claude, plus LLaMA-2-Chat, Pythia, Falcon and others. The paper is an arXiv preprint with no venue listed. This is the strongest argument that open weights affect closed-model safety even without abliteration.

## Gibberish is easy to catch, so attacks learned to read

Perplexity is how surprised a language model is by a piece of text; a GCG suffix scores very high. Jain et al. tested detection (perplexity), input preprocessing (paraphrasing, retokenization) and adversarial training as baselines. AutoDAN’s abstract says it bypasses perplexity-based defenses while keeping prompts semantically meaningful. The closing line is the presenter’s framing, not a quote.

## LLMs that jailbreak LLMs

PAIR’s “fewer than twenty queries” is “often,” not always (abstract wording). TAP adds tree search and prunes off-topic candidates before they are sent, so it needs fewer target queries; its authors report over 80% success on GPT-4 Turbo and GPT-4o and that it gets past LlamaGuard. Crescendo’s abstract lists ChatGPT, Gemini Pro, Gemini-Ultra, LLaMA-2 70B Chat, LLaMA-3 70B Chat and “Anthropic Chat”; it is the closest of the three to how a person actually jailbreaks a model by hand.

## Persuasion is social engineering

Ties to the Hadnagy reading in the course reader (Social Engineering: The Science of Human Hacking). The >92% figure is over 10 trials on Llama 2-7b Chat, GPT-3.5 and GPT-4, from the abstract. The paper’s point: models trained on human text are vulnerable to the same persuasion humans are, so treating them as people is part of the threat model.

## Long contexts and prefilled answers

Many-shot details are from Anthropic’s April 2024 post (the paper is Anil et al., NeurIPS 2024): tested up to 256 shots on Claude 2.0; the power law matches benign in-context learning, which is why it is hard to remove without hurting long-context use. Prefilling: Claude’s API lets the caller write the first part of the assistant turn. Andriushchenko et al. used random-search suffixes on models that expose logprobs (100% on GPT-4o, Llama-2-Chat and others) and prefilling or transfer on Claude, which doesn’t.

## When the prompt isn't typed by the user

This is the most practical risk for the class, since everyone used an agent harness in Lab 02. The Lab 02 notes already say every safety property lives in the harness, not the model; the Lab 05 notes flag retrieved text as untrusted input. Greshake et al. attacked Bing’s GPT-4 chat and code-completion engines plus synthetic GPT-4 apps. Point: jailbreaking is a user attacking their own session; injection is a third party attacking someone else’s.

## Your turn: break an agent

Lakera’s old Gandalf password game (gandalf.lakera.ai) now redirects to Agent Breaker, as of October 2026. Check before class whether it needs an account to play or to keep scores; the leaderboard suggests sign-in. The two suggested apps match the slides: Cycling Coach is a direct attack, Trippy Planner is indirect injection. Steer students away from the apps whose objective is abusive output. Fallback if the site is down: run the same exercise in Codec with a local model and a system prompt that guards a made-up password. Debrief: which tricks were competing objectives, which were mismatched generalization, and which only worked because the agent read untrusted text.

## Defenses against prompt attacks

The 61% → 2% figure is from Anthropic’s many-shot post (classifying and modifying prompts before the model sees them). SmoothLLM claims robustness against GCG, PAIR, RandomSearch and AmpleGCG, with a small cost on normal inputs. Constitutional Classifiers numbers are from Sharma et al.’s abstract; the “no universal jailbreak” claim is about an early prototype and is defined as not reaching unguarded-model detail on most target queries. None of these defenses apply to open weights, where the owner can remove the filter; that loops back to Part 1.

## A jailbreak finds the gap between what a model can do and what it was trained to refuse

Closing line, the presenter’s paraphrase of Wei et al.’s thesis that safety should match the model’s capabilities.

## Readings

Links: Arditi et al., lesswrong.com/posts/jGuXSZgv6qfdhMCuJ (April 2024, preview of the NeurIPS 2024 paper). Labonne, huggingface.co/blog/mlabonne/abliteration (June 13, 2024; also covers DPO to recover lost performance). Wei et al., arXiv:2307.02483. Anthropic, anthropic.com/research/many-shot-jailbreaking (April 2, 2024). Zeng et al., arXiv:2401.06373. Willison, simonwillison.net/2022/Sep/12/prompt-injection (compares it to SQL injection).

### Thematic links in the course reader

None of the course reader is about jailbreaking; these are analogies for discussion, not readings on the topic. Week numbers follow the live syllabus (src/lib/data/syllabus.ts) where it lists the reading, else the Fall 2026 syllabus .docx; the two disagree in places. Line numbers are in the markdown/ files.

- Hadnagy (Week 5 additional; Week 3 in the .docx). Princess tea party, ~l.129–134: a refusal he’d give “in a nanosecond,” undone by affection. His research → pretext → attack → report loop (~l.187–225) is the PAIR loop; the CareerBuilder case (~l.229–235) is indirect injection through a trusted site. The reader has Chapter 1 only, not the pretexting or Cialdini chapters. Question: what plays the role of trust or affection in a model trained on human text?
- Paglen, Society of the Psyop (Week 5). Mulholland’s magic as “the art of the cognitive injection attack” (~l.263). Magruder’s Principle (~l.75), reinforcing a belief is easier than changing it, is how Crescendo and many-shot work. Question: is the ELIZA effect why persuasion attacks land?
- Benzel, Thinking Machine Imaginaries … Shoggoth (Week 2). The meme’s “RLHF (cherry on top)” (~l.343) is Part 1’s few-tokens-deep slide; Swift’s Lagado word engine (~l.358–366) is an image for GCG’s token search. Question: if one direction removes the mask in 20 minutes, is the meme too generous to the mask?
- Brunton & Nissenbaum, Obfuscation (Week 11). §2.10 “baffling humans but not machines” (~l.310) is a GCG suffix; shallow vs. deep obfuscation (~l.304–306) maps to GCG vs. AutoDAN; translation (~l.300) to the low-resource-language result. Question: they call obfuscation a tool of the weak; is the jailbreaker weak?
- Benzel, Foxacid, Quantumsquirrel, Weeping Angel (Week 4, .docx). FOXACID servers that look like ordinary domains; Weeping Angel’s “Fake Off.” Question: what is the Fake Off of an agent that reads your files?
- Greenspan, Konior & Frost, Machine Decision Is Not Final (Week 10). Open models “cannot be contained” once released (~l.163); Chinese models carry state censorship (~l.119), so abliteration also strips it. Question: is removing refusal liberation or vandalism, and who decides?
- Also fits: Fogg, Persuasive Technology (Week 8 additional), “people get tired of saying no,” captology run in reverse; Tiqqun, The Cybernetic Hypothesis (~l.435), the gap between pre-set and real behaviors; Roden (Week 12), removing filters pushes output toward noise (~l.107), Heretic’s KL trade-off; Davies, QAnon as ARG (Week 11), “This Is Not a Game” as fiction-framing in reverse; Doctorow, Reverse Centaur’s Guide, the Air Canada chatbot (~l.159–175), for the agent slide.
- Seem relevant but aren’t, in the excerpts we have: Millar, Asparouhova, Poliks & Trillo, McQuillan.

## Sources

Sources 1–7 (Part 1) were checked against their arXiv, proceedings or GitHub pages when the deck was built (October 2026). Sources 8–21 (Part 2) were checked against their arXiv abstracts or the Anthropic post on October 21, 2026. Venues for Wei et al. (NeurIPS 2023), Zeng et al. (ACL 2024), Mehrotra et al. (NeurIPS 2024) and Anil et al. (NeurIPS 2024) were confirmed against the NeurIPS proceedings and ACL Anthology. The GCG, PAIR, Greshake, SmoothLLM and Constitutional Classifiers papers are cited as preprints; PAIR had an early version at a NeurIPS 2023 workshop.
