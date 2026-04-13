# Lalit R. Bahl, Frederick Jelinek, Robert L. Mercer, *A Maximum Likelihood Approach to Continuous Speech Recognition*

**Week:** 9 (Additional / Primary Documents — Robert Mercer / RenTech thread)
**File:** `markdown/additional_reading_primary_documents/Robert Mercer et al., A Maximum Likelihood Approach to Continuous Speech Recognition.md`
**Length:** 140 lines (read in full; OCR is rough but the abstract, Sections I–IV, the experimental tables, and the bios are recoverable)

## Summary

This 1983 IEEE PAMI paper by the IBM Watson speech-recognition group (Bahl, Jelinek, Mercer) is one of the founding texts of statistical NLP. It reframes continuous speech recognition as a problem in *communication theory*: the speaker is a noisy channel, and the linguistic decoder must recover the most likely word sequence by maximizing P(w)·P(y|w) using a Markov source model of the language and an acoustic-channel model of the speaker. The paper argues for n-gram language models trained from large text corpora (rather than hand-built grammars), introduces the dynamic-programming "stack decoder," and reports word-error rates on the Raleigh artificial language and the IBM Laser patent corpus. Mercer would later leave IBM to co-run Renaissance Technologies (Medallion Fund) and become a major Republican donor; this paper is the technical pedigree behind that move.

## Key quotes

- *"Speech recognition is formulated as a problem of maximum likelihood decoding. This formulation requires statistical models of the speech production process."* (line 7, Abstract)
- *"In Fig. 2, speech recognition is formulated as a problem in communication theory. The speaker and acoustic processor are combined into an acoustic channel, the speaker transforming the text into a speech waveform and the acoustic processor acting as a data transducer and compressor."* (line 7)
- *"Linguistics has not progressed to the point that it can provide a grammar for a sizable subset of natural English which is useful for speech recognition. In addition, the interest in linguistics has been in specifying the sentences of a language, but not their probabilities. Our approach has been to model the text generator as a Markov source, the parameters of which are estimated from a large sample of text."* (line 11)
- *"A major advantage of using Markov source models for the text generator and acoustic channel is that once the structure is specified, the parameters can be estimated automatically from data"* (line 13)
- *"There is a clear correlation between perplexity and error rate... Note that for each of the tasks, the performance of the time-synchronous acoustic processor is considerably better than that of the segmenting acoustic processor."* (line 91)

## Why it's in the course

This is the paper where the central methodological move of contemporary AI — replace a structured theory of language with a probabilistic model whose parameters you estimate from a huge corpus — is being argued for in real time, against linguists who would prefer hand-built grammars. Reading it makes clear that the entire LLM era is downstream of this 1983 decision, and that one of its authors (Mercer) personally bridges the IBM speech lab, the most successful quantitative hedge fund in history, and Trump-era right-wing political funding.

## Relevance to the lab

Apparatus: this is the founding statement of the "estimate parameters from a large sample of text" stance that determines the politics, the corpus bias, and the labor structure of every subsequent language model. Loading the machine: the paper is explicit that the choice of training corpus is the artistic choice — Raleigh artificial grammar vs. laser patents vs. CMU-AIX05 — which is a direct way into the "what do you feed the apparatus" stance.
