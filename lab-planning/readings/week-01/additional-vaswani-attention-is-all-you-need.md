# Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin, *Attention Is All You Need* (2017)

**Week:** 1 (Additional / Primary Documents)
**File:** `markdown/additional_reading_primary_documents/Illia Polosukhin, et al, Attention is all you need 1706.03762v7.md`
**Length:** 369 lines

## Summary

The 2017 Google Brain / Google Research paper that introduced the Transformer architecture — the backbone of every modern large language model. The authors propose abandoning recurrence and convolutions entirely in favor of stacked self-attention and feed-forward layers, with multi-head scaled dot-product attention as the core operation. The paper reports new state-of-the-art BLEU scores on WMT 2014 English-German (28.4) and English-French (41.8) translation, at a small fraction of previous training costs, and demonstrates transfer to English constituency parsing. The authors frame attention as a mechanism that maps a query and a set of key-value pairs to a weighted output.

## Key quotes

- *"We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely."* (line 23)
- *"In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output."* (line 39)
- *"An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key."* (lines 69, 79)
- *"Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this."* (line 103)
- *"As side benefit, self-attention could yield more interpretable models. We inspect attention distributions from our models... Not only do individual attention heads clearly learn to perform different tasks, many appear to exhibit behavior related to the syntactic and semantic structure of the sentences."* (line 168)

## Why it's in the course

Week 1's *"Attention is all you need"* unit reads the paper against McLuhan's "juicy piece of meat" line on attention-capture and the course's wider arc on the attention economy (hype, memes, Trump/Twitter, "meme + hype + 'AI' = accumulative power"). Pairing this engineering document with Selfridge's 1958 paper lets students see how today's transformer descends in a direct line from pandemonium's parallel feature-shrieking.

## Relevance to the lab

**Apparatus (i).** Students must be able to say, concretely, what a transformer *is* before they can critique what it decided. The paper also provides the vocabulary — tokens, embeddings, keys/queries/values, heads, positional encoding, beam search — that the rest of the seminar assumes. Labs using Hugging Face, Colab, local LLMs, or any prompting workflow are already inside this architecture; naming it is the first stance-one move.
