# Lab 05 notes: Duct tape brain

Deck: `/lab/5`. Lab items: RAG and vector databases, building bot personality and tools.

The best demo in this session is the site the class already reads on. Its explain and chat feature is a retrieval augmented generation pipeline, and the code is readable in one sitting.

---

## 0. The frame in one paragraph

A model has no memory and no library. Everything it appears to know sits in the weights, fixed at training time, plus whatever text is in the current prompt. Retrieval augmented generation is the standard way around that: before answering, go find relevant text and paste it into the prompt. Nothing is learned, nothing is stored in the model, and the word "knows" is doing no work. What people call a bot's memory and personality are both just text placed in front of the question.

---

## 1. RAG, the pipeline

Lewis et al., 2020, named it. The industrial version is five steps and no magic.

**Ingestion, done once:**

1. **Chunk.** Split documents into pieces of a few hundred to a thousand tokens, usually with overlap so a sentence cut in half still appears whole somewhere.
2. **Embed.** Run each chunk through an embedding model, which returns a fixed length vector, typically 384 to 3072 numbers. Similar meaning gives nearby vectors. Lab 07 covers how these are learned.
3. **Store.** Keep the vectors with a pointer back to the text.

**Query, per question:**

4. **Embed the question** with the same model, and find the nearest chunks by cosine similarity.
5. **Paste those chunks into the prompt** with an instruction to use them, and send it to the model.

Point at the visible consequence: the model's answer changes because the prompt changed. Nothing else changed. Run the same question with retrieval off and on, side by side, and the room sees it.

### The course site as the worked example

Worth putting on the projector, because it is small and real:

- Chunks are indexed per reading, with Gemini producing the embeddings.
- On each chat turn, the site retrieves the three most similar chunks **from the same reading only**, and appends them to the system prompt with an instruction to quote from them and not invent passages.
- Retrieval failure is non fatal: if the index is missing or the embedding call errors, the chat continues without context.
- The system prompt is split into a stable course level part and a per conversation part, because the stable part is cached by the API at a discount.

That last detail is a good one to dwell on. The prompt is engineered for cost, not only for quality. Money shapes the text the model sees.

---

## 2. Vector databases, demystified

A vector database stores vectors and answers "which stored vectors are closest to this one".

**The honest scaling note first.** For under roughly a hundred thousand vectors, comparing against all of them by brute force takes milliseconds. You do not need a database; a list in memory or a table works. Most projects in this room are in that regime. Say so, because the industry does not.

Above that, you trade exactness for speed with approximate nearest neighbour search:

- **HNSW** (Malkov and Yashunin, 2016), the common default. A layered graph you walk downward, greedily. Fast, memory hungry.
- **IVF**, cluster the space, only search the nearest few clusters. Cheaper memory, you can miss things at cluster boundaries.
- **Product quantisation**, compress vectors into codes. Much smaller, less accurate.

The word approximate is the point. These structures can miss the best match and usually will not tell you.

**Distance.** Cosine similarity measures angle, ignoring magnitude, and is the usual choice for text. Dot product is equivalent when vectors are normalised, which they usually are. Euclidean distance is rarely what you want here.

---

## 3. Why RAG fails, which is the interesting part

Students will build one and it will be mediocre. These are the reasons, and diagnosing which one is the actual skill:

- **The chunk boundary.** The answer straddles two chunks and neither is retrievable on its own. Overlap helps and does not solve it.
- **Vocabulary mismatch.** The question and the passage mean the same thing in different words, and the embedding model was not trained to bridge that particular gap. Hybrid retrieval, meaning keyword search plus vectors, is the standard patch.
- **Top k is a guess.** Three chunks might miss it, ten might bury it.
- **Lost in the middle** (Liu et al., 2023). Models attend most reliably to the start and end of a long context. A relevant passage placed in the middle of a big prompt is measurably more likely to be ignored. Ordering matters, which is an uncomfortable fact about a system presented as neutral lookup.
- **The model ignores the context anyway**, and answers from the weights. It looks the same to the user.
- **Fabricated citations.** The model can invent a quotation attributed to the retrieved chunk. Retrieval reduces hallucination; it does not remove it. Lab 06 is exactly this.

Say the summary line plainly: RAG makes the model's answer more likely to be grounded. It does not make it true, and it does not make it honest about which part came from where.

---

## 4. Personality is a prompt

This is the deflationary point of the second half, and it is worth doing live.

A bot's "personality" is a block of text placed before the conversation, usually called the system prompt. That is the whole mechanism. Change the paragraph, get a different character. There is no persistent self, no memory between conversations unless the application stores transcripts and pastes them back in, and no state inside the model at all.

What actually shapes the character:

- **The system prompt.** Register, stance, what to refuse, how long to answer. The course site's says it is a reading assistant for a graduate seminar and to not dumb things down. That single sentence changes the outputs more than most parameter tuning.
- **Few shot examples.** Two or three sample exchanges in the desired voice do more than paragraphs of description. Show, do not tell, applies to prompts.
- **Sampling settings.** Temperature, from Lab 01. A low temperature reads as flat and careful; a high one as loose and unreliable. People read this as personality.
- **Length instructions.** The site sets three modes with different token limits and different instructions. The brief mode reads as a different character from the deep mode, and it is the same model.

Good exercise: one question, three system prompts written by the room, run in sequence. Then ask which of the three "it" was.

---

## 5. Tools, and the loop from Lab 02

The same loop, restated because it is the load bearing idea for anyone building a bot:

1. Describe each tool as a name, a description, and a JSON schema for its arguments.
2. Send that list with the prompt.
3. The model replies asking to call a tool.
4. Your code runs it and appends the result.
5. Repeat until the model answers in text.

Two practical points:

- **The description is prompt engineering.** The model chooses tools based on the words in the description. A vague description produces a tool that never gets used or gets used wrongly.
- **The model cannot do anything your code does not implement.** Every capability, and every risk, is on your side of the line. If a tool can delete files, the agent can delete files.

Worth naming, briefly, because it is this course's subject matter: text that comes back from a tool, or from a retrieved document, is untrusted input. If a retrieved chunk contains instructions, a naive agent may follow them. That is prompt injection, and it is the security consequence of a design where instructions and data are the same string.

---

## 6. Questions to expect

**"Is this how ChatGPT remembers me?"** In broad shape, yes. Stored facts get retrieved and pasted into the prompt. The model is unchanged between conversations.

**"Should I fine tune instead?"** Almost never, for knowledge. Fine tuning teaches form and style; retrieval supplies facts. Fine tuning on documents to make a model "know" them is the most common expensive mistake.

**"Does the bot know it looked something up?"** It sees the text in its prompt. Whether it tells the user, and whether it distinguishes retrieved text from its own priors, depends entirely on the instructions.

**"How big should chunks be?"** Start at 500 to 800 tokens with 10 to 20 percent overlap, then look at actual failures.

---

## 7. References

- Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*, 2020.
- Malkov and Yashunin, *Efficient and robust approximate nearest neighbor search using HNSW graphs*, 2016.
- Liu et al., *Lost in the Middle*, 2023.
- The course site's own `src/routes/api/chat/+server.ts` and `src/lib/server/retrieval.ts`.
- Bonabeau et al., *Swarm Intelligence*, and Woodard, *Slime Dynamics*, assigned this week.
