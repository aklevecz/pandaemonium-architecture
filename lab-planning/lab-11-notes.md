# Lab 11 notes: Interlocks, Cognitive Hierarchies, Rhizomatics

Deck: `/lab/11`. Lab items: project work, and the LOIC, HOIC and chaff material. Students present projects.

**Scope note.** This session discusses attack tools as history and as objects of study. Nothing here is run against anything. Denial of service against a system you do not own is a crime in the United States under the Computer Fraud and Abuse Act, and people went to prison for exactly the tool named in the syllabus. The obfuscation half is different: those techniques are defensive, legal, and the class can actually use them.

---

## 0. The frame in one paragraph

Two opposite responses to being visible inside a network. One floods a target with traffic until it stops responding, which is loud, illegal, and historically catastrophic for the people who used it. The other floods an observer with plausible noise so that the real signal cannot be picked out, which is quiet, legal, and the subject of one of this week's readings. Both are volume tactics against an asymmetry of power. Only one of them worked out for the participants.

---

## 1. LOIC and HOIC, as history

The Low Orbit Ion Cannon began as a network stress testing tool and became the instrument of Anonymous's Operation Payback in 2010, after PayPal, Visa and Mastercard cut off donations to WikiLeaks. It was distributed with a mode that let a user hand control of their machine to a coordinating channel. HOIC followed, adding scripted request patterns.

**The technically important part, and the one worth an entire slide:** LOIC provided no anonymity whatsoever. It sent traffic directly from the participant's own address, which was logged by the target like any other request. The tool's interface implied collective anonymity while its implementation provided none. Fourteen people were charged in the PayPal case and pleaded guilty in 2013. Similar prosecutions followed in the United Kingdom and the Netherlands.

That gap between what an interface implies and what the protocol does is the actual lesson, and it generalises far past this tool. It is Lab 01's fourth question in a different domain: something was set for you, you could not see it, and the consequence was yours.

**Why the tactic also failed on its own terms.** A volunteer flood is a contest of capacity against infrastructure built for far more traffic than volunteers can supply. The framing of it as a digital sit-in, argued sincerely at the time, does not survive the comparison: a sit-in puts the participant's body in the space and their identity is the point, whereas this put their address in a log while promising it did not.

---

## 2. Chaff and obfuscation

The other half, and the part the class can actually practise. Brunton and Nissenbaum's *Obfuscation* is assigned and is the reference text.

The military original: chaff is strips of metal foil released to fill a radar screen with returns, so the real aircraft cannot be resolved. Not stealth, which is the absence of signal, but the production of too many signals. The definition Brunton and Nissenbaum use is close to that: the deliberate addition of ambiguous, misleading or plausible information to interfere with surveillance and data collection.

Working examples, all real software:

- **TrackMeNot** (Howe and Nissenbaum, 2006). Issues randomised search queries from the browser so the genuine ones sit inside noise.
- **AdNauseam** (2014). Clicks every blocked advert, so the profile built from clicks becomes meaningless. Google removed it from the Chrome store, which is itself the interesting part of the case.
- **FaceCloak** (2009), assigned in the seminar list: shows fake profile information to the platform while real information is displayed only to authorised friends via a browser extension.
- **Quote stuffing** in markets: orders placed and cancelled in bulk to slow competitors' feeds. The same technique, deployed by the powerful side.

**The honest weaknesses**, which the book itself raises and which should be in the room:

- It is a cost imposition, not a defence. A sufficiently motivated analyst with enough data can often separate the real from the noise.
- It pollutes shared resources. The noise you add is in everyone's data.
- It requires the thing being obfuscated to still function, which limits how much noise you can add.

The general principle worth writing down: obfuscation is a weapon of the weak, useful precisely when you cannot opt out, cannot go dark, and cannot change the system. That is most people, most of the time, which is why the book matters.

---

## 3. Interlocks and hierarchies, briefly

Two technical notes attached to the seminar material:

- **Mark Lombardi's drawings** are, formally, network graphs: nodes for people and institutions, edges for transactions and relationships. He drew them by hand from public reporting. Everything a modern graph analysis tool does, centrality, community detection, path finding, is a mechanisation of what he was doing by eye. The relevant question is what changed when it was automated, and the answer is scale, not method.
- **The cognitive hierarchy model** (Camerer, Ho and Chong, 2004), assigned: players are modelled at levels, where a level-k player best responds to their belief that others are at levels below k. Observed play in experiments concentrates around levels one and two, not at the Nash equilibrium. It is a formal, testable account of why strategic reasoning stops early, and it is a much sharper tool than the loose sense of "hierarchy" the week's title suggests.

---

## 4. Running the presentations

Practical, since this is the first presentation week:

- Rehearse the demo once on the room's projector before class. Every live demo that has ever failed, failed on the display or the network.
- Have a recording of the working state. If the demo dies, the recording plays and the talk continues.
- Ten minutes is short. The four questions from Lab 01 are a usable spine: what is the state, what counts as a neighbour, where did the rule come from, who set the sampler.
- Ask each presenter what they could not find out about their own tool. The gaps are the most interesting part of every one of these presentations.

---

## 5. References

- Brunton and Nissenbaum, *Obfuscation: A User's Guide for Privacy and Protest*, 2015. Assigned.
- Camerer, Ho and Chong, *A Cognitive Hierarchy Model of Games*, 2004. Assigned.
- Crumley, *Heterarchy*, assigned.
- Coleman, *Hacker, Hoaxer, Whistleblower, Spy*, 2014, for the Anonymous history including the LOIC prosecutions.
