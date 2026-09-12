# Lab 09 notes: Hopeium is a hell of a drug

Deck: `/lab/9`. The syllabus assigns no lab items for this week. These notes cover the technical concepts inside Scott's material, so there is something to answer with if the room asks, and a starting point if a lab half gets added.

---

## 0. What the seminar half is doing

Cryptography to cryptocurrency to prediction markets to the current funding structure of AI. The technical objects that come up are hash functions, proof of work, market makers, and high frequency trading. None of them require a demo, and each has one fact that clears up most confusion.

---

## 1. Hash functions

A cryptographic hash takes any input and returns a fixed length string, for SHA-256 always 256 bits. Three properties matter:

- **Deterministic.** Same input, same output, always.
- **One way.** Given the output, there is no better method than trying inputs.
- **Collision resistant.** Finding two inputs with the same output should be infeasible.

The avalanche property is the demonstrable one: change one character of the input and every bit of the output changes unpredictably. If a laptop is open, hash a sentence, then hash it with one letter changed, side by side.

The site the class reads on uses this: sign-in tokens are stored only as SHA-256 hashes, so a copy of the database cannot be replayed into a session.

---

## 2. Proof of work, and what Bitcoin actually solved

Nakamoto, 2008, is assigned this week and is nine pages. The problem it addresses is narrow: how do parties who do not trust each other agree on the order of transactions with no central authority.

The mechanism: transactions are grouped into a block; the block includes a hash of the previous block, which is what makes it a chain; miners vary a nonce until the block's hash falls below a target. Because hashing is one way, the only method is guessing, so finding a valid block is proof that computation was spent. Rewriting history means redoing all the work since, faster than the rest of the network is adding to it.

Two points that cut through most arguments:

- **The energy use is not an inefficiency to be optimised away.** The cost is the security mechanism. A cheaper proof of work is a weaker one. This is why the debate is not a debate about engineering.
- **The difficulty adjusts** so blocks arrive about every ten minutes regardless of how much hardware joins. More miners does not mean more transactions, it means more work per block.

Merkle trees are the other structure worth naming: hashing pairs of transactions up to a single root, so a single hash commits to every transaction in the block and any one can be proved to belong without transmitting the rest.

---

## 3. Prediction markets

Polymarket and Kalshi come up. The technical claim in their favour is that a market price for a contract paying one dollar on an event is an estimate of that event's probability, because traders who are better calibrated take money from traders who are not.

What is actually established: prediction markets have performed comparably to or better than polls on many political questions. What is also true: they are thin, manipulable at low cost when volume is low, biased toward long shots (the favourite longshot bias, documented in betting markets for decades), and the price includes the cost of capital, so it is not purely a probability.

**Hanson's logarithmic market scoring rule** (2003) is the mechanism most of these use to provide liquidity when few people are trading. It is worth naming because it makes the market maker an algorithm with a fixed subsidy, rather than a counterparty with an opinion.

The link to the course: a prediction market and a model both output a probability distribution over outcomes, and both get read by their users as a statement about the world rather than as a summary of who bet what. Same category error, two apparatuses.

---

## 4. Speed, quants, and nonhuman time

High frequency trading is the clearest case in the course of a system operating on a timescale that excludes people by construction. Microwave towers between Chicago and New Jersey exist because light travels faster through air than through fibre, and the difference is worth millions of dollars per millisecond.

The 2010 flash crash is the standard reference: about a trillion dollars of market value evaporated and mostly returned within roughly half an hour, faster than any human process could respond. Johnson et al., 2013, catalogued thousands of similar sub second crashes and recoveries below the threshold of human perception, and argued they constitute a different regime.

This is the concrete version of the seminar's nonhuman temporalities, and it needs no theory to state.

---

## 5. References

- Nakamoto, *Bitcoin: A Peer-to-Peer Electronic Cash System*, 2008. Assigned.
- Hanson, *Logarithmic Market Scoring Rules*, 2003.
- Johnson et al., *Abrupt rise of new machine ecology beyond human response time*, Scientific Reports, 2013.
- Golumbia and Diederichsen, assigned this week, for the seminar half.
