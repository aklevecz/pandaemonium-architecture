export interface Reading {
	title: string;
	author: string;
	pdf: string;
}

export interface Week {
	number: number;
	date: string;
	title: string;
	// Not every week carries an epigraph in the syllabus.
	epigraph?: { text: string; source: string };
	topics: string;
	readings: Reading[];
	additionalReadings: Reading[];
	lab: string;
}

export const courseInfo = {
	title: 'Pandaemonium Architecture 6.0',
	code: 'ATEK-639/439',
	semester: 'Fall 2026',
	instructor: 'Scott Benzel',
	labs: 'Ariel Klevecz',
	schedule: 'Mondays 1-3:50 A211H',
	description: `This course examines whether artists employing machine learning, AI, predictive models, and other technics—tools of what Deleuze called “the Societies of Control”—can make art that is evocative, powerful, critical, perhaps even socially transformative.`,
	epigraphs: [
		{
			text: 'Whatever else AI is, it is not neutral, and neither can we be. AI is political because it acts in the world in ways that affect the distribution of power, and its political tendencies are revealed in the ways that it sets up boundaries and separations. The apparatus of AI forms feedback loops with the rest of society: it’s “a structured structure that becomes a structuring structure” (Bourdieu, 1980)',
			source: 'Dan McQuillan, Resisting AI, an Anti-fascist Approach to Artificial Intelligence'
		},
		{
			text: '…rituals of reversal…“rewire” the crucial connections in the social structure by providing symbolic statements of traditional social imperatives and basic categories of…world view.',
			source: 'Evon Z. Vogt, Rituals of Reversal as a Means of Rewiring Social Structure'
		}
	]
};

export const introductoryReadings: Reading[] = [
	{
		title: 'from Resisting AI, an Anti-fascist Approach to Artificial Intelligence',
		author: 'Dan McQuillan',
		pdf: 'Dan McQuillan from Resisting AI_ An Anti-fascist Approach to Artificial Intelligence-Bristol University Press (2022).pdf'
	}
];

export const weeks: Week[] = [
	{
		number: 1,
		date: 'September 14',
		title: 'A grin without a cat',
		topics:
			'A cybernetic system, the Cheshire Cat in Decentraland, the para-real and the propaganda model; naïve realism, AI sycophancy, inducement, simulation, and parasocial masking; MIME-NET to FAANG to MAG7; platforms v. institutions; Total Information Awareness, the Thielverse, and vice signaling; prediction market/AI symmetry, Polymarket, Kalshi, and hype-vorticism; Libidinal Materialism — Kant, Nietzsche, Schopenhauer, Bataille, Deleuze and Guattari; Capital + State Power + Technology = Cybernetics; Attention is all you need — self-attention and transformers; Jasia Reichardt’s Cybernetic Serendipity; Gustav Metzger and the (D)ARPA pill; Gregory Bateson, cybernetics, and Marcel Duchamp; Norbert Wiener’s Gun Controller and the birth of cybernetic art; The Mechanisation of Thought Processes symposia — O.G. Selfridge, Paradise Lost, and Pandaemonium Architecture; von Neumann and Ulam’s game theory, cellular automata, and self-replicating machines; Conway’s Game of Life, alife, to generative AI',
		readings: [
			{
				title: 'Human-Computer Interaction Design and the Cybersemiotic Experience',
				author: 'Claudia Jacques',
				pdf: 'Claudia Jacques, Human-Computer Interaction Design and the Cybersemiotic Experience.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Attention is all you need',
				author: 'Illia Polosukhin, et al.',
				pdf: 'additional_reading_primary_documents/Illia Polosukhin, et al, Attention is all you need 1706.03762v7.pdf'
			},
			{
				title: 'Pandemonium: A Paradigm For Learning',
				author: 'O.G. Selfridge',
				pdf: 'additional_reading_primary_documents/O.G. Selfridge, PANDEMONIUM: A PARADIGM FOR LEARNING.pdf'
			},
			{
				title: 'The Creative Act',
				author: 'Marcel Duchamp',
				pdf: 'additional_reading_primary_documents/Marcel Duchamp, The Creative Act.pdf'
			},
			{
				title: 'Notes on À bruit secret: on Duchamp, Cybernetics, CIA, and Organized Crime',
				author: 'Scott Benzel',
				pdf: 'Notes on À bruit secret_ Notes on Duchamp, Cybernetics, CIA, and Organized Crime.pdf'
			},
			{
				title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
				author: 'Robin Rombach, et al.',
				pdf: 'additional_reading_primary_documents/Robin Rombach, et al., High-Resolution Image Synthesis with Latent Diffusion Models.pdf'
			}
		],
		lab: 'TBD — generative/toy AI: Golly, Koan to Wotja, et al; latent diffusion models and transformers: “toy AIs” to LLMs, diffusion models, world models'
	},
	{
		number: 2,
		date: 'September 21',
		title: 'Shoggoth with a Smiley Face',
		epigraph: {
			text: 'The “content” of the medium is like the juicy piece of meat carried by the burglar to distract the watchdog of the mind.',
			source: 'Marshall McLuhan'
		},
		topics:
			'Shoggoth with a Smiley Face; Ramon Llull, Mary Shelley, Ada Byron Lovelace, alife and code; lock in, path dependency, quasi-teleology, contingency, the Outside, and the cone of possibility; Negative Capability and the Black Box; the Rosicrucian Enlightenment and the Westphalian order; Andreessen Horowitz’s Techno-Optimist Manifesto, Srinivasan’s Network State, Moldbug’s SovCorp; Technocracy Inc., the Hollerith Tabulator, IBM, Howard Scott, and Joshua Haldeman; Project Phoenix, Arpanet, and the birth of the internet in counterinsurgency; the Macy Conferences; Claude Shannon’s information theory and Shannon’s Labyrinth; Basilisks — Reza’s, Roko’s, Sandifer’s; first to second order cybernetics, von Foerster, Maturana, Varela; Sozialeplastik, Neuroplastique, abstraction, and the Hack; Antimemetics — Cozyweb v. Dark Forest; the Melian Dialogue, Sun Tzu, Clausewitz, war gaming to game theory to predictive algorithms; Simulmatics, scenario planning, prediction markets, and the Pentagon’s “Terror Market”; implicit vs. explicit models, modelling for explanation or prediction; W.E.B. Du Bois’ Megascope to PROMIS to Total Information Awareness to Palantir; the Nooscope, precrime, and full spectrum hegemony; Cybersyn, Project Cyberfolk and algedonic metering; how to disappear completely',
		readings: [
			{
				title: 'There Is No Antimemetics Division',
				author: 'qntm',
				pdf: 'qntm, There Is No Antimemetics Division.pdf'
			},
			{
				title: 'Notes on Thinking Machine Imaginaries: Llull, Leibniz, and Lovelace to ‘Shoggoth with a Smiley Face’',
				author: 'Scott Benzel',
				pdf: "Notes on Thinking Machine Imaginaries_ Llull, Leibniz, and Lovelace to 'Shoggoth with a Smiley Face'.pdf"
			}
		],
		additionalReadings: [
			{
				title: 'from Extreme Privacy: What It Takes to Disappear',
				author: 'Michael Bazzell',
				pdf: 'additional_reading_primary_documents/Michael Bazzell -  from Extreme privacy what it takes to disappear (2020).pdf'
			},
			{
				title: 'Antimemetics: Why Some Ideas Resist Spreading',
				author: 'Nadia Asparouhova',
				pdf: 'Nadia Asparouhova, from Antimemetics_ Why Some Ideas Resist Spread.pdf'
			},
			{
				title: 'Introduction, from What Should We Do With Our Brain?',
				author: 'Catherine Malabou',
				pdf: 'Catherine Malabou, Introduction from What should we do with our brain.pdf'
			},
			{
				title: 'Life with the Artificial Anasazi',
				author: 'Jared Diamond',
				pdf: 'additional_reading_primary_documents/Jared Diamond, Life with the artificial Anasazi.pdf'
			}
		],
		lab: 'TBD — introduction to Claude, GitHub, Hugging Face, et al'
	},
	{
		number: 3,
		date: 'September 28',
		title: 'Degrade the Threads',
		epigraph: {
			text: 'In the past this information has been suppressed / But now it can be told / Every man, woman, and mutant / On this planet shall know the truth of de-evolution',
			source: 'Devo'
		},
		topics:
			'Cognitive offloading, second screen, blast beats, and rage rap; devolution, slurp juice, mutation, degens, and IP; enshittification; consensus reality vs. burbclaves; speedrunning, cozyweb v. bitrot, vibe coding, slop; New Memory, the wood between worlds; Walter Lippmann, Edward Bernays, propaganda, and public relations; the XX Committee, counterintelligence, and Angleton’s “wilderness of mirrors”; social engineering, parasocial relations, mis/dis/mal/info, pentesting, redteaming; Philip K. Dick, Jameson, Lyotard, Baudrillard, and Simulationism in art; Manuel DeLanda’s Philosophy and Simulation; the Simulation Hypothesis and its discontents; SCL/Cambridge Analytica, OCEAN, and captology; RenTech to NLP to LLMs; Young-Grrrl War-Machine and the Cyberfeminism Index; D&D to MUDs to MMORPGs; ARGs to dreampolitik — ong’s hat, the Beast, ilovebees, Year Zero, Cicada 3301, gamejacking, and occult memetics; Bernard Suits, C. Thi Nguyen, Games: Agency as Art; Gamergate and algorithmic radicalization; APTs, opsec, exploits, zero days; the Deep Private — Black Cube, Psygroup, Palantir, Wikileaks',
		readings: [
			{
				title: 'Everyone Is a Girl Online',
				author: 'Alex Quicho',
				pdf: 'Alex Quicho, Everyone Is a Girl Online WIRED.pdf'
			},
			{
				title: 'from Cyberfeminism Index',
				author: 'Mindy Seu (editor)',
				pdf: 'Mindy Seu (editor) - from Cyberfeminism Index.pdf'
			},
			{
				title: 'Notes on New Memory, the Wood between Worlds',
				author: 'Scott Benzel',
				pdf: 'Notes on New Memory - Scott Benzel.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'The Techno-Optimist Manifesto',
				author: 'Andreessen Horowitz',
				pdf: 'additional_reading_primary_documents/The Techno-Optimist Manifesto Andreessen Horowitz.pdf'
			},
			{
				title: 'Techno-Optimist Manifesto (redacted by Grosser)',
				author: 'Andreessen, redacted by Grosser',
				pdf: 'additional_reading_primary_documents/Techno-Optimist-Manifesto-Andreessen-redacted-by-Grosser.pdf'
			},
			{
				title: 'from Social Engineering: The Science of Human Hacking',
				author: 'Christopher Hadnagy',
				pdf: 'Christopher Hadnagy, from Social Engineering The Science of Human Hacking.pdf'
			},
			{
				title: 'Speedrunning Through The Language-Game',
				author: 'Adam Elkus',
				pdf: 'Adam Elkus, Speedrunning Through The Language-Game.pdf'
			},
			{
				title: 'Too big to care: Enshittification is a choice',
				author: 'Cory Doctorow',
				pdf: 'additional_reading_primary_documents/Cory Doctorow, Too big to care. Enshittification is a choice. _ by Cory Doctorow _ Medium.pdf'
			},
			{
				title: 'The Evil Demon of Images',
				author: 'Jean Baudrillard',
				pdf: 'Jean Baudrillard, The evil demon of images, 1987.pdf'
			},
			{
				title: 'Introduction to Philosophy and Simulation: The Emergence of Synthetic Reason',
				author: 'Manuel DeLanda',
				pdf: 'additional_reading_primary_documents/Manuel DeLanda - Introduction to Philosophy and Simulation_ The Emergence of Synthetic Reason-Continuum.pdf'
			},
			{
				title: 'Are You Living In A Computer Simulation?',
				author: 'Nick Bostrom',
				pdf: 'Nick Bostrom, ARE YOU LIVING IN A COMPUTER SIMULATION?.pdf'
			},
			{
				title: 'Incunabula Papers',
				author: 'Joseph Matheny',
				pdf: 'additional_reading_primary_documents/Joseph Matheny, Incunabula Papers.pdf'
			},
			{
				title: 'from Games: Agency As Art',
				author: 'C. Thi Nguyen',
				pdf: 'C. Thi Nguyen - from Games_ Agency As Art-Oxford University Press (2020).pdf'
			},
			{
				title: 'Status as a Service (StaaS)',
				author: 'Eugene Wei',
				pdf: 'additional_reading_primary_documents/Eugene Wei, Status as a Service (StaaS).pdf'
			}
		],
		lab: 'TBD — LLMs, coding with LLMs'
	},
	{
		number: 4,
		date: 'October 5',
		title: 'A Pervasive Global Cognitive Automaton',
		epigraph: {
			text: 'Contemporary AI systems are now becoming human-competitive at general tasks and we must ask ourselves: Should we let machines flood our information channels with propaganda and untruth?',
			source: 'Open letter from tech CEOs suggesting an AI moratorium'
		},
		topics:
			'Planetary computation: platform, stack, model, machine; Charles Stross’ “very slow AIs” to imperceptible algorithmic value extraction devices; social, walled gardens, and yield farms; Trapwire, Predpol, Palantir, and pernicious feedback loops; memesis, thought contagion, media decentralization, and stochastic terror; Turing’s Computing Machinery and Intelligence, the Imitation Game, ELIZA, facebotlish, ChatGPT; Strategy of Tension and TAO — Xkeyscore, Foxacid, Quantumsquirrel, Weeping Angel; Lyotard’s Libidinal Economy; Tiqqun’s Cybernetic Hypothesis; Mark Fisher’s Capitalist Realism to Acid Communism and psychic infrastructure; aggregators, signal boosters, pirate funnels, and viral loops; Jimi Hendrix and positive feedback; Guattari, Integrated World Capitalism, molecular revolution, and asignifying semiotics; negative feedback, cybernetics, governors, and territorialization; feedforward nets and feedback in art; I.J. Good’s ultraintelligent machine; astrobiology and post-biological evolution; exocapitalism, CCRU, Orphan Drift, cyberpositive, machinic desire v. postcapitalist desire',
		readings: [
			{
				title: 'Platform and Stack, Model and Machine',
				author: 'Benjamin H. Bratton',
				pdf: 'Benjamin H_ Bratton, Platform and Stack, Model and Machine.pdf'
			},
			{
				title: 'Acid Communism',
				author: 'Matt Colquhoun',
				pdf: 'Matt Colquhoun, Acid Communism.pdf'
			},
			{
				title: 'Notes on Foxacid, Quantumsquirrel, Weeping Angel',
				author: 'Scott Benzel',
				pdf: 'Notes on Foxacid, Quantumsquirrel, Weeping Angel - Scott Benzel.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Cosmic Evolution, from Cosmos and Culture',
				author: 'Steven J. Dick',
				pdf: 'additional_reading_primary_documents/Steven J. Dick,  from Cosmos & Culture_ Cultural Evolution in a Cosmic Context-US National Aeronautics and Space Admin (2010).pdf'
			},
			{
				title: 'Speculations Concerning the First Ultraintelligent Machine',
				author: 'I.J. Good',
				pdf: 'additional_reading_primary_documents/I.J. Good, Speculations Concerning the First Ultraintelligent Machine complete.pdf'
			},
			{
				title: 'The Cybernetic Hypothesis',
				author: 'Tiqqun',
				pdf: 'Tiqqun - The Cybernetic Hypothesis (2001).pdf'
			},
			{
				title: 'SF Capital',
				author: 'Mark Fisher',
				pdf: 'Mark Fisher, SF Capital.pdf'
			},
			{
				title: 'ChatGPT, or the Eschatology of Machines',
				author: 'Yuk Hui',
				pdf: 'Yuk Hui ChatGPT, or the Eschatology of Machines - Journal 137.pdf'
			},
			{
				title: 'Deleuze’s Postscript on the Societies of Control, Updated for Big Data and Predictive Analytics',
				author: 'James Brusseau',
				pdf: 'James Brusseau, Deleuzes Postscript on the Societies of Control Updated for Big Data and Predictive Analytics.pdf'
			}
		],
		lab: 'TBD'
	},
	{
		number: 5,
		date: 'October 19',
		title: 'Young Slime Life, Swarm v. Slime Dynamics',
		epigraph: {
			text: 'Cells that fire together, wire together.',
			source: 'Folk saying'
		},
		topics:
			'Agent v. Swarm v. Protean Ooze; David Roden and Posthuman Life; Ian Buchanan, assemblage theory and the precession of assemblage; Harold Bloom’s “strong misreading”; parasocial slime life — Roberta Breitmore, Lil Miquela, the Brud, Tilly Norwood, Particle6; swarm dynamics and drone swarms; Polybius’s Histories, Arcadia, the Polybius square, and fire signals; Polybius by Sinneslöschen — psyop, rumint, rumortech, vaporware; TAO, Olympic Games, Nitro Zeus, and cyberkinetic/rumor warfare; DARPA SMISC and INCAS, GCHQ’s JTRIG; Frank Rosenblatt and the Perceptron; Minsky and Papert’s Perceptrons and linearly separable problems; scalars, vectors, sets, training, sorting, decision trees, leaf nodes, entropy splits; Edge Detector zine, Rudy Rucker',
		readings: [
			{
				title: 'from Swarm Intelligence: From Natural to Artificial Systems',
				author: 'Eric Bonabeau et al.',
				pdf: 'Eric Bonabeau et al, from Swarm intelligence from natural to artificial systems.pdf'
			},
			{
				title: 'from Slime Dynamics',
				author: 'Ben Woodard',
				pdf: 'additional_reading_primary_documents/Ben Woodard, from Slime Dynamics.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'from Perceptrons: An Introduction to Computational Geometry',
				author: 'Minsky and Papert',
				pdf: 'additional_reading_primary_documents/Minsky, Papert - from Perceptrons_ An Introduction to Computational Geometry.pdf'
			},
			{
				title: 'Notes on Polybius by Sinneslöschen, Nitro Zeus',
				author: 'Scott Benzel',
				pdf: 'Notes on Polybius by Sinneslöschen, Nitro Zeus - Scott Benzel.pdf'
			},
			{
				title: 'Agential Realism, from Meeting the Universe Halfway',
				author: 'Karen Barad',
				pdf: 'Karen Barad, Agential Realism from Meeting the universe halfway_ quantum physics and the entanglement of matter and meaning  -Duke University Press (2007).pdf'
			}
		],
		lab: 'TBD'
	},
	{
		number: 6,
		date: 'October 26',
		title: 'TBD Visitor',
		topics: 'Visitor — to be announced.',
		readings: [],
		additionalReadings: [],
		lab: 'TBD'
	},
	{
		number: 7,
		date: 'November 2',
		title: 'Eliminative Materialism and Neurophilosophy',
		epigraph: {
			text: 'If bitcoin marks the automation of intelligence, socio-semantic reason can only be seen as one possible intelligent system among many possible others rather than intelligence’s necessary and universal conditions.',
			source: 'Vincent Le'
		},
		topics:
			'Patricia and Paul Churchland, Sellars, Chalmers; p-zombies, sentience, sapience, geist; Donald Hoffman’s Interface Theory of Perception and its discontents; Hegel, Brandom, Sellars, Negarestani, Land — socio-semantic v. machinic consistency in intelligent systems; hypocognition v. hypercognition; distraction, amplifiers and suppressors, attention capture, audience capture, addiction maximizers; Addiction by Design; ambient intel, elicitation, preloading, pretexting, human buffer overflow, microexpressions, persuasion, framing, manipulation; centaur v. reverse centaur; bossware; extractive data labor; the Mechanical Turk to Amazon’s Mechanical Turk, chatfarms, labelfarms',
		readings: [
			{
				title: 'The Interface Theory of Perception',
				author: 'Donald Hoffman',
				pdf: 'Donald Hoffman, The Interface Theory of Perception.pdf'
			},
			{
				title: 'Revenge of the Chickenized Reverse-Centaurs',
				author: 'Cory Doctorow',
				pdf: 'Cory Doctorow, Revenge of the Chickenized Reverse-Centaurs.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'from Addiction by Design: Machine Gambling in Las Vegas',
				author: 'Natasha Dow Schüll',
				pdf: 'Natasha Dow Schüll, from Addiction by Design. Machine Gambling in Las Vegas.pdf'
			},
			{
				title: 'from Eliminative Materialism',
				author: 'Paul M. Churchland',
				pdf: 'additional_reading_primary_documents/Paul M. Churchland, from Eliminative materialism.pdf'
			},
			{
				title: 'from Intelligence and Spirit',
				author: 'Reza Negarestani',
				pdf: 'additional_reading_primary_documents/Reza Negarestani - from Intelligence and Spirit.pdf'
			}
		],
		lab: 'Multi-dimensional data, t-SNE, word clouds'
	},
	{
		number: 8,
		date: 'November 9',
		title: 'Police and Thieves',
		epigraph: {
			text: 'The generative model can be thought of as analogous to a team of counterfeiters, trying to produce fake currency and use it without detection, while the discriminative model is analogous to the police, trying to detect the counterfeit currency.',
			source: 'Ian J. Goodfellow, et al.'
		},
		topics:
			'GANs, discriminative models, transformers, diffusion models; SBF, FTX, effective altruists / effective accelerationists / Zizians; psyop to mindwar to likewar; hybrid war, asymmetry, and 4GW; Equation Group v. Shadow Brokers — DANDERSPIRITZ, EWOKFRENZY, WANNACRY; exfiltration doxware; Clearview AI, Flock/Deflock; memetic warfare, social credit, affective computing, and pseudoPSI; autoasymmetry — the Inversion, bots, celeb followbots; arcana imperii, secretum, mysterium; hidden layers in neural nets, walled gardens, encrypted comms; reciprocal panopticism — Reddit karma, 4chan degraded threads, 8kun tripcodes; one-way mirrors — DARPA’s Lifelog to Meta Portal; criminogenic banks, BCCI to In-Q-Tel; Meta captology and BJ Fogg’s persuasive computing',
		readings: [
			{
				title: 'from Persuasive Technology: Using Computers to Change What We Think and Do',
				author: 'BJ Fogg',
				pdf: 'additional_reading_primary_documents/BJ Fogg, from Persuasive technology_ using computers to change what we think and do.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Generative Adversarial Nets',
				author: 'Ian J. Goodfellow, et al.',
				pdf: 'additional_reading_primary_documents/Ian Goodfellow, et al., Generative Adversarial Nets.pdf'
			},
			{
				title: 'Large Scale GAN Training for High Fidelity Natural Image Synthesis',
				author: 'Andrew Brock, et al.',
				pdf: 'additional_reading_primary_documents/Andrew Brock, et al., LARGE SCALE GAN TRAINING FOR HIGH FIDELITY NATURAL IMAGE SYNTHESIS.pdf'
			},
			{
				title: 'The TESCREAL bundle: Eugenics and the promise of utopia through artificial general intelligence',
				author: 'Timnit Gebru and Émile P. Torres',
				pdf: 'additional_reading_primary_documents/Timnit Gebru and Emile P. Torres, The TESCREAL bundle: Eugenics and the promise of utopia through artificial general intelligence.pdf'
			}
		],
		lab: 'TBD'
	},
	{
		number: 9,
		date: 'November 16',
		title: 'Hopeium is a hell of a drug',
		topics:
			'Cipherpunks to fintech to DeFi/CeFi/prediction markets and AI; the Caesar Cipher to Enigma, Turing’s bombes, and Colossus; MILCRYP, Lambros D. Callimahos, and the Zendian Problem; phreaks, hackers, and goldbugs; David Chaum’s Blind Signatures, DigiCash, Tim May’s Crypto Anarchist Manifesto, Hashcash, BitGold; Satoshi Nakamoto; bubbles — AI, NFTs; Polymarket, Kalshi; Golumbia’s Software as Rightwing Extremism; Dogecoin and the birth of the memecoin; quants, HFT, and dark pools; the flash crash, ultrafast black swans, and nonhuman temporalities; Mercer — NLP to RenTech to Cambridge Analytica; DeFi to CeFi to memefi — Robinhood, Wallstreetbets, Gamestop; reflexive ponzis and yield farms; crypto and Nash equilibria, zero sum minus, greater fool theory; autocatallaxy, hyperscaling, and circular AI funding; Seth Siegelaub’s Artist’s Reserved Rights Transfer and Sale Agreement; On (Surplus) Value In Art — NFTs, second-order use value, surplus extraction, digital scarcity',
		readings: [
			{
				title: 'Bitcoin: A Peer-to-Peer Electronic Cash System',
				author: 'Satoshi Nakamoto',
				pdf: 'Satoshi Nakamoto, Bitcoin, A Peer to Peer Electronic Cash System.pdf'
			},
			{
				title: 'from On (Surplus) Value In Art',
				author: 'Diedrich Diederichsen',
				pdf: 'Diedrich Diederichsen - On (Surplus) Value In Art-Sternberg Press _ Witte de With (2008).pdf'
			}
		],
		additionalReadings: [
			{
				title: 'MILCRYP: from Military Cryptanalytics Pt. 3',
				author: 'Lambros D. Callimahos',
				pdf: 'additional_reading_primary_documents/Lambros D. Callimahos, from Military Cryptanalytics Pt3 1977.pdf'
			},
			{
				title: 'from Bitcoin, Software as Rightwing Extremism',
				author: 'David Golumbia',
				pdf: 'additional_reading_primary_documents/David Golumbia, from Bitcoin, software as rightwing extremism.pdf'
			},
			{
				title: 'A Maximum Likelihood Approach to Continuous Speech Recognition',
				author: 'Robert Mercer, et al.',
				pdf: 'additional_reading_primary_documents/Robert Mercer et al., A Maximum Likelihood Approach to Continuous Speech Recognition.pdf'
			}
		],
		lab: 'TBD'
	},
	{
		number: 10,
		date: 'November 23',
		title: 'What’s the Deal with Birds?',
		epigraph: {
			text: 'Birds are very strange. Some people are like “whoa they’re flying around and stuff, what’s the deal with that?” This sentiment is shared by people across socioeconomic backgrounds. Figuring out what the deal is with birds is of the utmost scientific importance.',
			source: 'Daniel T. Baldassarre, What’s the Deal with Birds?'
		},
		topics:
			'Birds Aren’t Real — fighting predatory journals and internet hoaxing; hoaxing, Yippies to Yes Men to Birds Aren’t Real; Art as Abstract Machine — Deleuze and Guattari’s abstract machines, levelism in art',
		readings: [
			{
				title: 'Introduction, Art as Abstract Machine: Ontology and Aesthetics in Deleuze and Guattari',
				author: 'Stephen Zepke',
				pdf: 'Stephen Zepke, Introduction, Art as Abstract Machine_ Ontology and Aesthetics in Deleuze and Guattari.pdf'
			},
			{
				title: 'What’s the Deal with Birds?',
				author: 'Daniel T. Baldassarre',
				pdf: "Daniel T. Baldassarre, What's the deal with birds 2020.pdf"
			}
		],
		additionalReadings: [
			{
				title: 'The Method of Levels of Abstraction',
				author: 'Luciano Floridi',
				pdf: 'additional_reading_primary_documents/Luciano Floridi, The method of levels of abstraction.pdf'
			}
		],
		lab: 'TBD'
	},
	{
		number: 11,
		date: 'November 30',
		title: 'Interlocks, Cognitive Hierarchies, Rhizomatics',
		epigraph: {
			text: '(Heterarchy is) an emergent organizational form with distinctive network properties … and multiple organizing principles.',
			source: 'Stark'
		},
		topics:
			'Mark Lombardi, interlocks, A Cognitive Hierarchy Model of Games, heterarchy, rhizomatics; information hierarchies and data silos; Aaron Swartz’s Guerilla Open Access Manifesto, JSTOR, and academic journals; Substack, Patreon, dark/walled servers; Slashdot, Hacker News, Stack Overflow; compartmentalization, fusion centers, and desiloing; Lulzsec to Nulzsec — digital activism left and right, CCC, Legion of Doom, cDc/Hacktivismo, Anonymous, AnonOps, LOIC; Internet Research Agency, Council for National Policy; chans and occult memetics, Pepe, Kek, /pol to Q; right metapolitics and narrative laundering; Fog Reveal v. Chaff, Pegasus v. Predator; obfuscation, false tells, making analysis inefficient, babble tapes, Operation Vula, quote stuffing, Bayesian flooding, FaceCloak; ECHELON and warrantless mass surveillance; fogging, flooding, and surfacing; Cytex, Intellexa, NSO Group, and mercenary spyware',
		readings: [
			{
				title: 'The Gamification of Conspiracy: QAnon as ARG',
				author: 'Hugh Davies',
				pdf: 'Hugh Davies, The Gamification of Conspiracy QAnon as ARG.pdf'
			},
			{
				title: 'from Obfuscation: A User’s Guide for Privacy and Protest',
				author: 'Finn Brunton and Helen Nissenbaum',
				pdf: 'Finn Brunton, Helen Nissenbaum, from Obfuscation, a users guide for privacy and protest.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Heterarchy',
				author: 'Carole L. Crumley',
				pdf: 'additional_reading_primary_documents/Carole L. Crumley, Heterarchy.pdf'
			},
			{
				title: 'A Cognitive Hierarchy Model of Games',
				author: 'Colin F. Camerer, Teck-Hua Ho, Juin-Kuan Chong',
				pdf: 'additional_reading_primary_documents/COLIN F. CAMERER TECK-HUA HO JUIN-KUAN CHONG, Cognitive Hierarchy Theory of Games.pdf'
			},
			{
				title: 'Fogging and Flooding: Countering Extremist Mis/Disinformation After Terror Attacks',
				author: 'GNET Report',
				pdf: 'additional_reading_primary_documents/GNET-Report-Fogging-And-Flooding-Countering-Extremist-MisDisinformation-After-Terror-Attacks.pdf'
			},
			{
				title: 'Guerilla Open Access Manifesto',
				author: 'Aaron Swartz',
				pdf: 'additional_reading_primary_documents/Aaron Swartz, Guerilla Open Access Manifesto.pdf'
			}
		],
		lab: 'TBD — your project / LOIC, HOIC, chaff. Present your project'
	},
	{
		number: 12,
		date: 'December 7',
		title: 'Rewiring Social Structure / Parasites Lost',
		epigraph: {
			text: 'I must Create a System, or be enslav’d by another Mans / I will not Reason and Compare; my business is to Create.',
			source: 'William Blake'
		},
		topics:
			'Vogt’s Rituals of Reversal as a Means of Rewiring Social Structure; rewiring as always already happening — social media and social structure; algorithmic austerity v. Red Plenty and Cybersyn; very slow AIs to algorithmic value capture devices, a reprise; Dator and Candy’s possibility vs. probability space; Parasites Lost — David Roden, Posthuman Life and Subtractive-Catastrophic Xenophilia; demontology; Accelerando’s Lobster AIs, MIT’s Norman, Zero HP Lovecraft’s Minotaur, Cthulhu AI; Claire Colebrook’s In Praise of the Flat Earth and counterethics, Zoe v. Bios; ethical AI, game theory, and defection; Isabel Millar, The Psychoanalysis of Artificial Intelligence; a thorough rugging — exit scams, rugging, the Big Rugpull',
		readings: [
			{
				title: 'Rituals of Reversal as a Means of Rewiring Social Structure',
				author: 'Evon Z. Vogt',
				pdf: 'additional_reading_primary_documents/Evon Z. Vogt, Rituals of Reversal as a Means of Rewiring Social Structure.pdf'
			},
			{
				title: 'Mimesis, Violence, and Facebook: Peter Thiel’s French Connection',
				author: 'Geoff Shullenberger',
				pdf: 'Geoff Shullenberger, Mimesis, Violence, and Facebook_ Peter Thiels French Connection.pdf'
			},
			{
				title: 'Subtractive-Catastrophic Xenophilia',
				author: 'David Roden',
				pdf: 'David Roden, Subtractive-Catastrophic Xenophilia.pdf'
			},
			{
				title: 'from The Psychoanalysis of Artificial Intelligence',
				author: 'Isabel Millar',
				pdf: 'Isabel Millar - from The Psychoanalysis of Artificial Intelligence.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'The Gig Economy',
				author: 'Zero HP Lovecraft',
				pdf: 'additional_reading_primary_documents/Zero HP Lovecraft, The Gig Economy.pdf'
			},
			{
				title: 'A Globe of One’s Own, In Praise of the Flat Earth',
				author: 'Claire Colebrook',
				pdf: 'additional_reading_primary_documents/Claire Colebrook, A Globe of Ones Own.pdf'
			},
			{
				title: 'On Social Sadism',
				author: 'China Miéville',
				pdf: 'additional_reading_primary_documents/China Mieville, On Social Sadism - Salvage.pdf'
			}
		],
		lab: 'Present your project'
	}
];

const R2_BASE = 'https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev';

export function getPdfUrl(pdf: string): string {
	return R2_BASE + '/' + pdf.split('/').map(encodeURIComponent).join('/');
}

export function getReadingUrl(pdf: string): string {
	const slug = pdf
		.replace(/\.pdf$/i, '')
		.replace(/^additional_reading_primary_documents\//, '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return '/reading/' + slug;
}
