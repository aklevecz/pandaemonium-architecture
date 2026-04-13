# O. G. Selfridge, *Pandemonium: A Paradigm For Learning* (1958)

**Week:** 1 (Additional / Primary Documents)
**File:** `markdown/additional_reading_primary_documents/O.G. Selfridge, PANDEMONIUM: A PARADIGM FOR LEARNING.md`
**Length:** 258 lines

## Summary

Selfridge's 1958 paper, given at the UK's *Mechanisation of Thought Processes* symposium, proposes a parallel-processing pattern-recognition architecture that names its agents after the demons of Milton's *Paradise Lost*. A hierarchy of "data demons," "computational subdemons," "cognitive demons," and a single "decision demon" each "shriek" an output proportional to how strongly they detect a feature; the decision demon picks the loudest. The model also introduces feature weighting via hill-climbing, "mutated fission" and "conjugation" for generating new subdemons, and natural-selection-style elimination of low-worth demons — essentially sketching learning, evolutionary algorithms, and ensemble methods in one document. The course takes its name from this paper.

## Key quotes

- *"We are proposing here a model of a process which we claim can adaptively improve itself to handle certain pattern recognition problems which cannot be adequately specified in advance."* (line 23)
- *"We are not going to apologize for a frequent use of anthropomorphic or biamorphic terminology."* (line 27)
- *"Each cognitive demon computes a shriek, and from all the shrieks the highest level demon of all, the decision demon, merely selects the loudest."* (line 57)
- *"The scheme sketched is really a natural selection on the processing demons. If they serve a useful function they survive, and perhaps are even the source for other subdemons who are themselves judged on their merits."* (line 145)
- *"If one conceives of the brain as a pandemonium — a collection of demons — perhaps what is going on within the demons can be regarded as the unconscious part of thought, and what the demons are publicly shouting for each other to hear, as the conscious part of thought."* (line 207, McCarthy in discussion)
- *"All of us have sinned in Adam, we have eaten of the tree of the knowledge of good and evil, and the demonological allegory is a very old one, indeed."* (line 252)

## Why it's in the course

The course is *named* after this paper — Week 1 uses it as the primary-source anchor for the seminar's central metaphor: AI as a city of screaming daemons, with the Miltonic/theological framing explicitly acknowledged by Selfridge and his interlocutors. It pairs with the Jacques reading on cybersemiotics and with Duchamp's *Creative Act* (which was delivered only a year earlier) as the other pole of the 1957–58 moment when art, cybernetics, and AI were thinking the same thing.

## Relevance to the lab

**Apparatus (i) and Loading (iii).** Selfridge's demons decide what counts as a feature *before* the user arrives — the subdemon set is seeded by the designer's "reasonable selection," then culled by worth. Students should read this as the clearest possible illustration that every ML pipeline bakes in prior commitments at the subdemon level; the "loading" stance is literally choosing which demons to screaming-seat.
