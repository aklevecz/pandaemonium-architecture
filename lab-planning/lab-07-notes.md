# Lab 07 notes: A word is worth a thousand numbers?

Deck: `/lab/7`. Lab items: multi-dimensional data, t-SNE, word clouds, tokenisation, embeddings, word2vec, and the psychology and biochemistry of memory and synaptic connections.

---

## 0. The frame in one paragraph

Before a model can process language it has to turn text into numbers, twice. First it cuts the string into tokens, using a vocabulary fitted to a corpus by a compression algorithm. Then it maps each token to a vector of a few hundred numbers, learned from which words appear near which. Both steps are where meaning gets decided, and both are usually invisible. The last third of the session puts that next to the biological story about memory, and the honest finding there is that the analogy is much weaker than the vocabulary suggests.

---

## 1. Tokenisation

### What it is

A model has a fixed vocabulary, typically 30,000 to 200,000 entries, and text is cut into pieces from that list. The pieces are not words. Common words are single tokens; rare words are split; a space is usually part of the following token.

**Byte pair encoding**, the usual method, is a compression algorithm from 1994 repurposed for this in 2016. Start with individual characters, count adjacent pairs across the corpus, merge the most frequent pair into a new symbol, repeat a few tens of thousands of times. The vocabulary is the merge list. There is no linguistics in it at all; it is frequency statistics on the training text.

### Why it matters, with demonstrable consequences

- **Counting letters.** The model cannot reliably count the r's in "strawberry" because it never sees letters; it sees two or three tokens. This is not a reasoning failure, it is a representation failure, and it is the best five second demo in the course.
- **Arithmetic.** Numbers tokenise inconsistently, so digits do not align, so long multiplication is hard for reasons unrelated to mathematics.
- **Language inequality.** A vocabulary fitted mostly to English encodes English efficiently and everything else badly. The same sentence can cost several times more tokens in Hindi or Burmese than in English. Since API pricing and context limits are per token, non English users pay more and fit less. That is a political fact produced by a compression algorithm.
- **Rhyme and wordplay** are hard for the same reason as spelling.

Show the tokeniser on screen. Paste in a student's name, a URL, an emoji, a line of another language, and let the room watch the string come apart in ways nobody would have chosen.

---

## 2. Embeddings

### The distributional hypothesis

Firth, 1957: you shall know a word by the company it keeps. Words that appear in similar contexts have similar meanings. The whole of modern natural language processing rests on this one bet, and the bet mostly paid.

### From one hot to dense

The naive representation gives each word its own dimension: a vocabulary of 50,000 means a 50,000 long vector of zeros with a single one. Every word is exactly as far from every other, so it encodes nothing about meaning. An embedding replaces that with a few hundred numbers, learned, where distance means something.

### word2vec

Mikolov et al., 2013. Two training setups:

- **Skip-gram**: given a word, predict the words around it.
- **CBOW**: given the surrounding words, predict the middle one.

Train a shallow network on that task over a large corpus, then throw away the task and keep the hidden layer. The by-product is the point. Negative sampling made it fast enough to run on a billion words on one machine, which is why it spread.

### The famous analogy, and the correction

`king - man + woman ≈ queen`. It is real, it launched a thousand talks, and it is weaker than advertised. The standard evaluation excludes the three input words from the possible answers. Without that exclusion, the nearest vector is very often `king` itself. Nissim et al., 2020, laid this out carefully. Analogy performance is also strongly dependent on the corpus and mostly works for a narrow set of relations, largely geography and morphology.

State it as: there is real structure in the space, and the demo overstates how clean it is.

### Bias, as measurement rather than accusation

Because the vectors record co-occurrence, they record whatever the corpus associates. Caliskan et al., 2017, showed that standard word association tests from psychology reproduce on embeddings trained on web text: occupational and racial associations come out with effect sizes comparable to human subjects. The embedding is a measurement instrument pointed at a corpus. What it measured is in the corpus.

### Contextual embeddings, briefly

word2vec gives one vector per word, so `bank` has one vector for both meanings. From ELMo and BERT onward, the vector depends on the sentence, which is what the attention mechanism in Lab 01 is doing. Modern retrieval (Lab 05) uses sentence level embeddings from these models.

---

## 3. High dimensional space, and why it is strange

Two facts to state, because they explain why the visualisations in the next section are needed and why they lie:

- **Volume is at the edges.** In high dimensions almost all of the volume of a ball is near its surface, and almost all pairs of random vectors are nearly orthogonal. Intuitions from three dimensions do not transfer.
- **Distances concentrate.** As dimension grows, the ratio between the nearest and farthest neighbour approaches one. This is why cosine similarity (angle) is preferred over Euclidean distance for embeddings, and why "nearest" gets less meaningful as dimension rises.

---

## 4. t-SNE, and how to read it responsibly

t-SNE (van der Maaten and Hinton, 2008) takes points in many dimensions and places them in two, trying to keep near neighbours near. It is the source of nearly every colourful cluster picture in machine learning.

**What it preserves:** local neighbourhoods, approximately.

**What it does not preserve, and this is the part everyone gets wrong:**

- **Cluster sizes mean nothing.** t-SNE expands sparse clusters and contracts dense ones. A big blob is not a big category.
- **Distances between clusters mean nothing.** Two clusters far apart on the plot are not more different than two that are close.
- **Perplexity changes everything.** The main parameter, roughly the number of neighbours considered, typically 5 to 50. Different values produce genuinely different pictures from identical data.
- **It is not deterministic.** Different random seeds give different layouts. Same data, different picture, which should sound familiar from Lab 01.
- **It hallucinates structure.** Run it on pure random noise and you will get clusters, clean ones. This is the demo to run in the room. Nothing else convinces people as fast.

The Distill article by Wattenberg, Viégas and Johnson (2016) demonstrates all of these interactively and is the right thing to project.

**UMAP** (2018) is faster and claims to preserve more of the global structure. It has the same caveats and the same seductive output. **PCA** is linear, deterministic, and its axes actually mean something, which is why it is a good sanity check even though the pictures are duller.

The point to land: these are drawings, made with parameters, and the parameters are set by whoever made the drawing. Same question as the sampler in Lab 01.

### Word clouds, in one paragraph

A word cloud encodes exactly one variable, frequency, as size, and throws away order, syntax, negation, and context. Position and colour usually mean nothing at all. It is the least informative common visualisation in the humanities, and it is worth showing precisely so the room can say why it is worse than a sorted list of counts.

---

## 5. Memory and synapses, and where the analogy breaks

The vocabulary of neural networks is borrowed from biology, and the borrowing has been mostly one directional and mostly metaphorical since about 1960. Handle this section carefully; overclaiming here is the standard error.

### What the biology actually says

- **Hebb, 1949.** Cells that fire together wire together, in the popular compression. Repeated correlated activity strengthens a connection.
- **Long term potentiation.** Bliss and Lømo, 1973, in the rabbit hippocampus: brief high frequency stimulation produces a lasting increase in synaptic strength. This is the concrete cellular finding behind the Hebbian slogan.
- **Engrams.** The Tonegawa lab, from 2012, used optogenetics to label the cells active during a fear memory in mice and then reactivate them, producing the behaviour without the original cue. That is about as close to a physical trace of a specific memory as the field has.
- **Reconsolidation.** Retrieving a memory can make it labile again, so remembering is closer to rewriting than to reading. Well supported in animals, more contested in humans.

### Where the comparison to artificial networks fails

- **Backpropagation has no accepted biological equivalent.** It requires each synapse to know weights elsewhere in the network, the weight transport problem, and neurons have no mechanism for that. Feedback alignment and predictive coding are proposed workarounds; none is established as what brains do.
- **Timing.** Real synapses depend on the relative timing of spikes within milliseconds. Standard artificial neurons have no time in them at all.
- **Scale and kind.** A synapse is a chemical machine with hundreds of proteins, neuromodulators, and its own local state. An artificial weight is a float.
- **Learning regime.** Backpropagation needs many passes over a fixed dataset. Animals learn from single events.

The defensible statement: Hebbian ideas inspired the perceptron, and the family resemblance stops at inspiration. Saying a network learns like a brain is a claim nobody is in a position to make. That is a stronger and more useful thing to tell a room than either the hype or the dismissal.

---

## 6. Questions to expect

**"Do embeddings understand meaning?"** They encode co-occurrence statistics that correlate with meaning well enough to be useful. Whether that is understanding is the seminar's question, and the honest technical answer is that the vectors record which words share company.

**"Why does the model fail at spelling but write a sonnet?"** Different levels of representation. Sonnets are patterns over tokens; spelling is a pattern over characters it never sees.

**"Can I trust this cluster plot in a paper?"** Ask for the perplexity, the seed, and what the axes mean. If the answer is that the axes mean nothing, believe only that nearby points are similar.

**"Is a bigger embedding better?"** Up to a point, then it costs memory and retrieval speed for diminishing gains.

---

## 7. References

- Sennrich, Haddow and Birch, *Neural Machine Translation of Rare Words with Subword Units*, 2016, for BPE in this use.
- Mikolov et al., *Efficient Estimation of Word Representations in Vector Space*, 2013.
- Nissim, van Noord and van der Goot, *Fair Is Better than Sensational*, 2020, on the analogy claim.
- Caliskan, Bryson and Narayanan, *Semantics derived automatically from language corpora contain human-like biases*, Science, 2017.
- van der Maaten and Hinton, *Visualizing Data using t-SNE*, 2008.
- Wattenberg, Viégas and Johnson, *How to Use t-SNE Effectively*, Distill, 2016.
- Hebb, *The Organization of Behavior*, 1949. Bliss and Lømo, 1973. Liu et al., optogenetic engram work, Nature, 2012.
- Churchland and Negarestani, assigned this week, for the seminar half.
