# Marvin Minsky and Seymour Papert, from *Perceptrons: An Introduction to Computational Geometry* (expanded edition, 1988 — originally 1969)

**Week:** 5 (Additional / Primary Documents)
**File:** `markdown/additional_reading_primary_documents/Minsky, Papert - from Perceptrons_ An Introduction to Computational Geometry.md`
**Length:** 347 lines

## Summary

The excerpt opens with the famous 1988 Prologue, which Minsky and Papert added to the expanded edition to position their 1969 book in the history of AI. They describe the "war" between *symbolists* (serial, logical, hierarchical, discrete) and *connectionists* (parallel, analogical, distributed, continuous) and argue the dichotomy is false. The selection then moves into Chapter 0, which defines the Rosenblatt perceptron, formalizes predicates on geometric figures, and proves that some predicates — famously CONVEX — are *conjunctively local of order k* while others — famously CONNECTED — are not. This is the architectural ceiling the book made notorious: a single-layer perceptron cannot, in principle, compute certain global properties. The selection also includes the 1988 authors' retrospective on whether their book "killed" connectionism (they say no — it redirected the field toward knowledge representation for a needed decade).

## Key quotes

- *"No machine can learn to recognize X unless it possesses, at least potentially, some scheme for representing X."* (line 51)
- *"The sciences of computation and cybernetics began, and it seems quite rightly so, with a certain flourish of romanticism. They were laden with attractive and exciting new ideas which have already borne rich fruit… But now the time has come for maturity, and this requires us to match our speculative enterprise with equally imaginative standards of criticism."* (line 117)
- *"One reason why progress has been so slow in this field is that researchers unfamiliar with its history have continued to make many of the same mistakes that others have made before them."* (line 5)
- *"The marvelous powers of the brain emerge not from any single, uniformly structured connectionist network but from highly evolved arrangements of smaller, specialized networks which are interconnected in very specific ways."* (line 69)
- *"[An] important difference between ψconnected and CONVEX… [CONVEX] is conjunctively local of order 3… [Theorem 0.6.1:] connected is not conjunctively local of any order."* (lines 157–178)

## Why it's in the course

Week 5's *Edge Detectors* segment cites the book by name: "Frank Rosenblatt and the Perceptron, Marvin Minsky and Seymour Papert's *Perceptrons and linearly separable problems*… Scalars, Vectors, Sets, Training, Sorting, Decision Trees, Leaf nodes, Entropy splits." It is also the historical counterweight to Selfridge (Week 1) and Good (Week 4) — Pandemonium and the intelligence-explosion paper were written by the same 1950s–60s MIT circle, and *Perceptrons* is the text that slowed the first wave by naming exactly what the simple learning machine cannot do. Pairing it with Woodard's *Slime Dynamics* gives students both the proof (what a single-layer net cannot compute) and the philosophy (why the question of "intelligence vs. substrate" is itself suspect).

## Relevance to the lab

**Apparatus (i).** *Perceptrons* is the canonical demonstration that an architecture decides in advance which problems it can even represent. The CONVEX-vs-CONNECTED result is a clean, teachable case of the apparatus-level point: the limits are not about data, training, or scale, but about *what the machine is built to see*. For the Week 5 lab (particle systems, Unreal Engine), this translates directly: "pick a predicate your chosen engine cannot compute, and make a work that foregrounds that incapacity." The 1988 Prologue's warning — that the field repeats its mistakes because researchers do not know their history — is itself a lab principle for the whole seminar.
