# Lab 04 notes: Lossmaxing

Deck: `/lab/4`. Lab items: gradient descent and loss, cognitive displacement, how we plan, where effort and critical thought go inside automation, decision making.

---

## 0. The frame in one paragraph

Everything a model learned, it learned by making one number smaller. That number is the loss, and a person chose it. The training procedure has no opinion about anything the loss does not measure, and it will find any route to a lower number, including routes nobody intended. The second half of the lab turns the same question on the room: when you offload a task, you are choosing an objective too, and the things you stop practising are the things outside it.

---

## 1. Loss, concretely

A loss function takes the model's output and the desired output and returns one number, larger when the output is worse. Training is the search for parameters that make that number small on the training data.

Two you should be able to write on the board:

- **Mean squared error**, for continuous outputs: average of `(prediction - target)²`. Squaring makes large errors dominate, which is why MSE produces blurry images: when uncertain, the safest guess is the average of the possibilities, and the average of many sharp images is a blurry one. This is worth saying, because it explains a visible property of a whole class of models.
- **Cross entropy**, for classification and for every token a language model emits: `-log p(correct answer)`. If the model gave the right token probability 0.9, the loss is about 0.105. If it gave it 0.01, the loss is about 4.6. The penalty for confidently wrong is unbounded, which is exactly the property you want.

**Perplexity** is just `exp(cross entropy)`. A perplexity of 20 means the model is as uncertain as if it were choosing uniformly among 20 options. It is the number in every language model paper before benchmarks took over.

Connect back to Lab 01: the model was trained to put probability on the observed next token. It outputs a distribution. Cross entropy is the scoring rule that made it do that.

---

## 2. Gradient descent

### The mechanism

The loss is a function of every parameter, millions or billions of them. The gradient is the vector of partial derivatives: for each parameter, how much the loss changes if you nudge that parameter up. Move every parameter a small step in the opposite direction, and the loss goes down. Repeat.

```
θ ← θ - η · ∇L(θ)
```

`η` is the learning rate, the step size. Too large and it overshoots and diverges; too small and it takes forever or settles in the first dip it finds. It is the single most consequential number in training and it is chosen by hand or by search.

### Backpropagation

The chain rule, applied efficiently. Compute the output, then walk backwards through the network computing each layer's contribution to the error from the layer after it. Rediscovered several times; popularised by Rumelhart, Hinton and Williams in 1986. It is not a learning theory, it is a way of computing derivatives without redundant work.

Say clearly: this is calculus, not intuition. There is no search for meaning, no hypothesis. There is a slope and a step downhill.

### Stochastic, mini batch, and the optimisers

Computing the gradient over the whole dataset per step is too expensive, so you use a random batch (stochastic gradient descent). The noise this introduces is useful; it helps escape shallow dips. **Momentum** accumulates a running direction so the path does not zigzag. **Adam** (Kingma and Ba, 2014) keeps a per parameter running average of gradient and gradient magnitude, so parameters that rarely fire still move. Adam is the default in most training scripts, which means most models were shaped by its particular biases.

### Overfitting, and why held out data exists

The loss on the training set can always be driven lower by memorising it. Split the data, watch the loss on data the model never trained on, and stop when that one stops improving. This is early stopping, and it is the whole reason for validation sets.

The link to Lab 03: a LoRA overfitting on twenty images is this exact phenomenon at small scale, visible in an afternoon.

---

## 3. What loss cannot see

This is the hinge of the session.

The optimiser has exactly one instruction and no common sense. It will find whatever makes the number go down, and there is no term in the objective for "in the way we meant".

- **Goodhart's law**, 1975, in Strathern's compact 1997 phrasing: when a measure becomes a target, it ceases to be a good measure. Written about economic policy; it describes machine learning exactly.
- **Specification gaming.** DeepMind maintains a long list of documented cases: agents that pause a game forever to avoid losing, that exploit physics bugs to travel, that learn the label distribution rather than the task. None of these are malfunctions. Each one is a system doing exactly what was asked.
- **Shortcut learning.** Classifiers that detected pneumonia from the hospital's scanner watermark rather than the lung. Detectors that found horses by the photographer's copyright tag. The model found a correlation that was genuinely present in the data and genuinely useless.
- **Reward hacking in RLHF.** When the training signal is a learned model of human preference, optimising it hard produces text that the preference model scores highly and people find sycophantic or padded. Sycophancy is not a personality flaw of the model; it is a measurable consequence of the objective.

The general statement, which is worth putting on a slide as a question rather than a claim: any part of the goal you did not encode in the loss is a part the system is free to sacrifice.

---

## 4. Cognitive displacement

The second half turns this on the room. Keep it empirical; the evidence here is thinner than the confidence around it.

### What is actually established

- **Cognitive offloading** is an old and robust finding, and predates computers: people externalise memory and computation whenever a reliable external store exists. Writing, notation, the calculator, the phone number you no longer know.
- **The Google effects study** (Sparrow, Liu, Wegner, 2011) found people remembered where to find information rather than the information, when they expected it to remain available. This is often cited as memory damage. What it shows is a shift in what gets encoded.
- **The GPS work.** Studies on habitual satellite navigation use and spatial memory show worse formation of survey knowledge, meaning the mental map, in people who navigate by turn instructions. This is the closest well studied analogue to what an AI assistant does to a skill.

### The recent AI specific studies, with their limits stated

- Gerlich, 2025, in *Societies*: a survey of several hundred participants finding a negative correlation between frequent AI tool use and critical thinking scores, mediated by self reported offloading. It is correlational. Heavy users may differ in other ways.
- The MIT Media Lab EEG study, 2025, comparing essay writing with an assistant, with a search engine, and unaided: lower measured connectivity and weaker recall of one's own text in the assistant group. Small sample, preprint, single task, short duration. It is suggestive and it is not settled.

Say both halves. The claim "AI makes you stupid" is not established. The claim "you do not practise what you delegate" is close to a definition.

### The useful formulation for a studio class

Delegation is fine, and everyone does it, and nobody grinds their own pigment. The question is not whether to offload but which loop you keep for yourself. Concretely: if you delegate the part where you would have discovered you were wrong, you have delegated the learning, not the labour.

---

## 5. Planning and decision making

Two distinctions worth drawing plainly, because they are what "lossmaxing" is aimed at.

**Optimising an objective versus choosing one.** Everything in sections 1 to 3 is the first. None of it touches the second. There is no procedure inside gradient descent that could ever tell you the loss was the wrong loss. That step is outside, and it is the only step that is irreducibly yours.

**Efficiency versus direction.** An optimiser makes you faster along the direction you are pointed. If the direction is wrong, faster is worse. This is why "it saved me three hours" is not, by itself, an argument, and it is the honest core of the seminar's critique.

For the room, a workable rubric for any tool, and it fits on one slide:

1. What is the objective this tool is optimising, and did I set it?
2. What is it not measuring that I care about?
3. If it is confidently wrong, how would I find out?
4. What skill am I not practising while it runs, and do I need that skill?

---

## 6. Questions to expect

**"Does the model know it is wrong?"** It has a distribution, so it has something like calibrated uncertainty, and modern instruction tuning tends to flatten the expression of it. Uncertainty in the numbers is not the same thing as a system that can flag itself.

**"Why not just add the missing thing to the loss?"** Sometimes you can. Often the thing you care about is not measurable, or measuring it changes it, which is Goodhart again one level up.

**"Is offloading always bad?"** No. Nobody argues for mental arithmetic on principle. The question is which loops you keep.

---

## 7. References

- Rumelhart, Hinton and Williams, *Learning representations by back-propagating errors*, 1986.
- Kingma and Ba, *Adam*, 2014.
- Strathern, "Improving ratings: audit in the British University system", 1997, for the usable phrasing of Goodhart.
- Krakovna et al., the DeepMind specification gaming list.
- Sparrow, Liu and Wegner, *Google Effects on Memory*, Science, 2011.
- Gerlich, *AI Tools in Society*, Societies, 2025. Correlational.
- Kosmyna et al., *Your Brain on ChatGPT*, MIT Media Lab preprint, 2025. Small n.
- Tiqqun, *The Cybernetic Hypothesis*, assigned this week, for the seminar half.
