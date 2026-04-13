# Satoshi Nakamoto, Bitcoin: A Peer-to-Peer Electronic Cash System

**Week:** 9
**File:** `markdown/Satoshi Nakamoto, Bitcoin, A Peer to Peer Electronic Cash System.md`
**Length:** 211 lines

## Summary

Nakamoto's 2008 whitepaper proposes a decentralized electronic cash system that eliminates the need for trusted financial intermediaries by using cryptographic proof rather than institutional trust. Double-spending is solved via a peer-to-peer network that hashes transactions into an ongoing, computationally expensive chain of proof-of-work, with nodes voting by CPU power rather than identity. The paper lays out the technical architecture (transactions as chains of digital signatures, timestamp server, proof-of-work difficulty, Merkle trees, simplified payment verification) and mathematically argues that an attacker's chance of rewriting the chain drops exponentially with block depth. The result is a minimally-structured, pseudonymous system where "honest" consensus is defined as the longest chain.

## Key quotes

- *"What is needed is an electronic payment system based on cryptographic proof instead of trust, allowing any two willing parties to transact directly with each other without the need for a trusted third party."* (line 11)
- *"Proof-of-work is essentially one-CPU-one-vote. The majority decision is represented by the longest chain, which has the greatest proof-of-work effort invested in it."* (line 37)
- *"The steady addition of a constant of amount of new coins is analogous to gold miners expending resources to add gold to circulation. In our case, it is CPU time and electricity that is expended."* (line 58)
- *"He ought to find it more profitable to play by the rules, such rules that favour him with more new coins than everyone else combined, than to undermine the system and the validity of his own wealth."* (line 62)
- *"privacy can still be maintained by breaking the flow of information in another place: by keeping public keys anonymous."* (line 94)

## Why it's in the course

Bitcoin is the foundational document for an entire regime of machine-authority: a system where trust is replaced by computation, identity by keys, and governance by the longest chain. For a seminar on AI/ML/cybernetics it names a specific apparatus that decides — before any user arrives — what counts as consensus, history, and value.

## Relevance to the lab

Primarily an **Apparatus** stance reading: the protocol is the neutral-seeming infrastructure that has already made political choices (one-CPU-one-vote, trust-as-work, pseudonymity-as-privacy). It also enables **Reversal/Opacity** thinking — the pseudonymous key-rotation model is a concrete obfuscation pattern students can redeploy.
