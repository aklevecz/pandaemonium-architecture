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
	/**
	 * The lab session. Written by hand each term into the .docx the site
	 * generates, then brought back here — `topic` is the session's title,
	 * `items` the lines under it. Empty items means the lab is still TBD.
	 */
	lab: { topic?: string; items: string[] };
	/** A break in the schedule falling after this week, e.g. a holiday. */
	noClassAfter?: string;
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
		epigraph: {
			text: "Well! I've often seen a cat without a grin, thought Alice, but a grin without a cat! It's the most curious thing I ever saw in my life!",
			source: 'Lewis Carroll, Alice in Wonderland'
		},
		topics:
			"A cybernetic system (cat trips out), the Cheshire Cat in Decentraland, the para-real and the propaganda model: Chomskian filters, ideology, and reality; naïve realism, AI sycophancy, inducement, simulation, and parasocial masking; the Hugging Face hack, reasoning agents, and drives, bootstrapping AGI, algorithmic innovation v. glorified autocomplete, recursive self-improvement, and Singularity; model collapse, common crawl, spine-cutters, and ISBNdB; MIME-NET to FAANG to MAG7; platforms v. institutions; existential v. instrumental technology; Total Information Awareness, Peter Thiel, The Antichrist, and vice signaling; TESCREAL, eacc, et al.; Libidinal Materialism, Deleuze and Guattari; decoding, deterritorialization, capitalism, and identity; feudal labor to wage-labor to abstract Capital (AI); Capital + State Power (Violence) + Technology = Cybernetics; Stargate: Cybernetics + State Capitalism = AGI; AI and counterinsurgency, robotics and counterethics; the 0-Degree Plane of Neuroelectronic Continuity, AI and psychosocial evaporation; Attention is all you need, self-attention, and transformers; compute, inference, and dumping; hype, mass culture, and cyberpositive loops; attention-economy, art, and cybernetics: Jasia Reichardt's Cybernetic Serendipity; Gustav Metzger, art, and the (D)ARPA pill; Gregory Bateson, cybernetics, and Marcel Duchamp; Norbert Wiener's Gun Controller, the Whitney brothers, and the birth of cybernetic art; The Mechanisation of Thought Processes symposia: O.G. Selfridge, Paradise Lost, and Pandaemonium Architecture; von Neumann and Ulam's game theory, cellular automata, and self-replicating machines; Conway's Game of Life, alife, cellular automata, to generative AI",
		readings: [
			{
				title: '0-Degree Plane of Neuroelectronic Continuity: AI and Psychosocial Evaporation',
				author: 'Marek Poliks and Roberto Alonso Trillo',
				pdf: 'Marek Poliks and Roberto Alonso Trillo, 0-Degree Plane of Neuroelectronic Continuity - AI and Psychosocial Evaporation.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Attention is all you need',
				author: 'Illia Polosukhin, et al.',
				pdf: 'additional_reading_primary_documents/Illia Polosukhin, et al, Attention is all you need 1706.03762v7.pdf'
			},
			{
				title: 'Human-Computer Interaction Design and the Cybersemiotic Experience',
				author: 'Claudia Jacques',
				pdf: 'Claudia Jacques, Human-Computer Interaction Design and the Cybersemiotic Experience.pdf'
			},
			{
				title: 'Pandemonium: A Paradigm For Learning',
				author: 'O.G. Selfridge',
				pdf: 'additional_reading_primary_documents/O.G. Selfridge, PANDEMONIUM: A PARADIGM FOR LEARNING.pdf'
			}
		],
		lab: {
			topic: 'What’s in the box?',
			items: [
				'Scott: generative/toy AI: Golly, Koan to Wotja, et al.',
				'Ariel: Monty Hall problem, sampling, autoregressive models, latent diffusion models'
			]
		}
	},
	{
		number: 2,
		date: 'September 21',
		title: 'Shoggoth with a Smiley Face',
		epigraph: {
			text: 'the ‘content’ of the medium is like the juicy piece of meat carried by the burglar to distract the watchdog of the mind.',
			source: 'Marshall McLuhan'
		},
		topics:
			"Shoggoth with a Smiley Face; Ramon Llull, Mary Shelley, Ada Byron Lovelace, alife and code; lock in, path dependency, quasi-teleology, determinacy, contingency, the Outside, and the cone of possibility; growth v. programming, drives v. desires; Negative Capability and the Black Box; the Rosicrucian Enlightenment, the Thirty Years War, and the Westphalian order; Andreessen Horowitz's Techno-Optimist Manifesto, Srinivasan's Network State, Snow Crash's burbclaves, Moldbug's SovCorp, no voice free exit, CEO-monarchs, company towns, and the Outside of the State; Technocracy Inc. to The Sovereign Individual; the Hollerith Tabulator, IBM, Howard Scott, Joshua Haldeman, the North American Technate, and Elon Musk; Project Phoenix, Arpanet, Vietnam, and the birth of the internet in counterinsurgency; the Macy Conferences; Claude Shannon's A Mathematical Theory of Communication, information theory, and Shannon's Labyrinth; neo-technocracy, Greenland, and Praxian Accelerationism; antimemetics: There Is No Antimemetics Division, Susan Blackmore's The Meme Machine, Incogni Research and The Great Digital Fatigue; Cozyweb, Dark Forest, and The Dark Forest Theory of the Internet; Thucydides' Melian Dialogue, Sun Tzu, Bacon, Machiavelli, Napoleon, Clausewitz, war gaming to game theory to predictive AI; Simulmatics, scenario planning, prediction markets, the Pentagon's Terror Market, assassination markets; implicit vs. explicit models, modelling for explanation or prediction; SEAS-VIS and Sentient World Simulation; W.E.B. Du Bois' Megascope, Total Information Awareness to SWS to Palantir to KAIROS; the Nooscope, precrime, and full spectrum hegemony; Cybersyn, Project Cyberfolk and algedonic metering; domain-specific AI; how to disappear completely, extreme privacy and its discontents",
		readings: [
			{
				title: 'from There Is No Antimemetics Division',
				author: 'qntm',
				pdf: 'qntm, There Is No Antimemetics Division.pdf'
			},
			{
				title: 'from The Dark Forest Theory of the Internet',
				author: 'Yancey Strickler',
				pdf: 'Yancey Strickler, The Dark Forest Theory of the Internet.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'The Great Digital Fatigue',
				author: 'Incogni Research',
				pdf: 'Incogni Research, The Great Digital Fatigue.pdf'
			},
			{
				title: 'from The Meme Machine',
				author: 'Susan Blackmore',
				pdf: 'additional_reading_primary_documents/Susan Blackmore, from The Meme Machine.pdf'
			},
			{
				title: 'from Extreme Privacy: What It Takes to Disappear',
				author: 'Michael Bazzell',
				pdf: 'additional_reading_primary_documents/Michael Bazzell -  from Extreme privacy what it takes to disappear (2020).pdf'
			}
		],
		lab: {
			topic: 'Applied Autopoiesis',
			items: [
				'Vibe coding introduction: Codec app; Github',
				'HuggingFace, Fal.ai',
				'ComfyUI, Fuser, Krea, Higgsfield'
			]
		}
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
			"Cognitive offloading, second screen, blast beats, and rage rap; devolution, slurp juice, mutation, degens; bitrot, slop wars, Shitpostmodernism, Understanding the Slopgeneration, and Why Slop Matters; New Memory, the (a)social (de)construction of reality; New Memory, the wood between worlds, We are happy at CERN; Walter Lippmann, Edward Bernays, propaganda and public relations; the XX Committee, counterintelligence, and James Jesus Angleton's wilderness of mirrors; social engineering, parasocial relations, mis/dis/mal/info, pentesting, redteaming, the malicious hacker to offensive security pipeline; Philip K. Dick, Fredric Jameson, Jean-François Lyotard, Jean Baudrillard, and Simulationism in art; the Simulation Hypothesis and its discontents; OCEAN, Facebook, and captology; OCEAN and model personalities; NLP, RenTech to LLMs; Young-Grrrl War-Machine, Cyberfeminism Index; Alex Quicho, Everyone is a Girl Online; Mindy Seu, Cyberfeminism Index",
		readings: [
			{
				title: 'The Mandela Effect and New Memory',
				author: 'Aaron French',
				pdf: 'Aaron French, The Mandela Effect and New Memory.pdf'
			},
			{
				title: 'Shitpostmodernism: Understanding the Slopgeneration',
				author: 'Kieran Press-Reynolds',
				pdf: 'Kieran Press-Reynolds, Shitpostmodernism - Understanding the Slopgeneration.pdf'
			},
			{
				title: 'Selections from Cyberfeminism Index',
				author: 'Mindy Seu (editor)',
				pdf: 'Mindy Seu (editor) - from Cyberfeminism Index.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'The Techno-Optimist Manifesto',
				author: 'Andreessen Horowitz',
				pdf: 'additional_reading_primary_documents/The Techno-Optimist Manifesto Andreessen Horowitz.pdf'
			},
			{
				title: 'Everyone Is a Girl Online',
				author: 'Alex Quicho',
				pdf: 'Alex Quicho, Everyone Is a Girl Online WIRED.pdf'
			},
			{
				title: 'Why Slop Matters',
				author: 'Cody Kommers, et al.',
				pdf: 'additional_reading_primary_documents/Cody Kommers, et al., Why Slop Matters.pdf'
			},
			{
				title: 'Why AI Slop Matters, but Not Like That',
				author: 'Sachita Nishal, et al.',
				pdf: 'additional_reading_primary_documents/Sachita Nishal, et al., Why AI Slop Matters, but Not Like That.pdf'
			}
		],
		lab: {
			topic: 'Fitting frequencies: computer perception and aesthetics',
			items: ['Iman Malik', 'Color', 'Style, LoRAs', 'Training LoRAs if time permits']
		}
	},
	{
		number: 4,
		date: 'October 5',
		title: 'Feedback',
		epigraph: {
			text: 'Contemporary AI systems are now becoming human-competitive at general tasks and we must ask ourselves: Should we let machines flood our information channels with propaganda and untruth? Should we automate away all the jobs, including the fulfilling ones? Should we develop nonhuman minds that might eventually outnumber, outsmart, obsolete and replace us? Should we risk loss of control of our civilization?',
			source: 'Pause Giant AI Experiments: An Open Letter, The Future of Life Institute, 2023'
		},
		topics:
			"Jimi Hendrix and positive feedback; Félix Guattari, Integrated World Capitalism, molecular revolution, asignifying semiotics, and signaletic matter; negative feedback, cybernetics, governors, and territorialization; feedforward nets and feedback in art; I.J. Good's Speculations Concerning the First Ultraintelligent Machine; Steven J. Dick, astrobiology, intelligence, positive feedback, and post-biological evolution; cyberpositive, CCRU, Orphan Drift, and exocapitalism; prediction market and AI symmetry, Polymarket, Kalshi, futarchy, and hype-vorticism; a pervasive global cognitive automaton; planetary computation: platform, stack, model, machine; Charles Stross's very slow AIs to imperceptible algorithmic value extraction devices; walled gardens, yield farms, distillation; Trapwire, Predpol to Palantir, Flock, and pernicious feedback loops; memesis, thought contagion, media decentralization, and stochastic terror; Turing's Computing Machinery and Intelligence, the Imitation Game, ELIZA, facebotlish, chatbots, sexbots, superpersuasion; Strategy of Tension and TAO: Xkeyscore, Foxacid, Quantumsquirrel, Weeping Angel; Lyotard's Libidinal Economy; Tiqqun's Cybernetic Hypothesis; Mark Fisher's Capitalist Realism to Acid Communism and psychic infrastructure",
		readings: [
			{
				title: 'Integrated World Capitalism and Molecular Revolution',
				author: 'Félix Guattari',
				pdf: 'Félix Guattari, Integrated World Capitalism and Molecular Revolution.pdf'
			},
			{
				title: 'Platform and Stack, Model and Machine',
				author: 'Benjamin H. Bratton',
				pdf: 'Benjamin H_ Bratton, Platform and Stack, Model and Machine.pdf'
			},
			{
				title: 'Acid Communism',
				author: 'Matt Colquhoun',
				pdf: 'Matt Colquhoun, Acid Communism.pdf'
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
			}
		],
		lab: {
			topic: 'Lossmaxing',
			items: [
				'Gradient descent + loss, cognitive displacement',
				'How do we plan? Where do we place effort and critical thought within automation?',
				'What do we need to do ourselves that supersedes optimization efficiency principles?',
				'Decision making'
			]
		},
		noClassAfter: 'October 12 — No class (Indigenous People’s Day)'
	},
	{
		number: 5,
		date: 'October 19',
		title: 'Polybius by Sinneslöschen, Nitro Zeus: Psyop and Rumint',
		epigraph: {
			text: 'cells that fire together, wire together',
			source: 'folk saying'
		},
		topics:
			"Polybius's Histories v. laodogmatika, Arcadia, the Polybius square, and fire signals; Polybius by Sinneslöschen: psyop, rumint, social engineering, and vaporware; TAO, Olympic Games, Nitro Zeus, and cyberkinetic/rumor warfare; DARPA SMISC and INCAS, GCHQ's JTRIG; Trevor Paglen's Society of the Psyop; Young Slime Life, swarm v. slime dynamics; agent v. swarm v. protean ooze; David Roden and Posthuman Life; parasocial slime life: Roberta Breitmore, Lil Miquela and the Brud, Tilly Norwood, Particle6, Misaligned; swarm dynamics, drone swarms, agentic swarms; theorycels v. operators; D&D to MUDs to MMORPGs; ARGs: ong's hat, the Beast, ilovebees, Year Zero, Synydyne, Cicada 3301, gamejacking, and occult memetics; Bernard Suits, C. Thi Nguyen, Games: Agency as Art; Gamergate and algorithmic radicalization; no true airgap, opsec, exploits; the Deep Private: Black Cube, Psygroup, Palantir, Academi, AnonOps, Wikileaks, Resistbot, elonjet",
		readings: [
			{
				title: 'Society of the Psyop',
				author: 'Trevor Paglen',
				pdf: 'Trevor Paglen, Society of the Psyop.pdf'
			},
			{
				title: 'from Swarm Intelligence: From Natural to Artificial Systems',
				author: 'Eric Bonabeau et al.',
				pdf: 'Eric Bonabeau et al, from Swarm intelligence from natural to artificial systems.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'from Social Engineering: The Art of Human Hacking',
				author: 'Christopher Hadnagy',
				pdf: 'Christopher Hadnagy, from Social Engineering The Science of Human Hacking.pdf'
			},
			{
				title: 'from Slime Dynamics',
				author: 'Ben Woodard',
				pdf: 'additional_reading_primary_documents/Ben Woodard, from Slime Dynamics.pdf'
			}
		],
		lab: {
			topic: 'Duct tape brain',
			items: ['RAG, vector db', 'Building bot personality and tools']
		}
	},
	{
		number: 6,
		date: 'October 26',
		title: 'Visitors: Daniel Small and Matt Sheridan Smith, Thumos',
		topics: 'Visiting artists Daniel Small and Matt Sheridan Smith, Thumos.',
		readings: [],
		additionalReadings: [],
		lab: {
			topic: 'Post truth psychosis',
			items: ['Hallucinations and repetition', 'Doing research with AI']
		}
	},
	{
		number: 7,
		date: 'November 2',
		title: 'Eliminative Materialism and Neurophilosophy',
		epigraph: {
			text: "If bitcoin marks the automation of intelligence, socio-semantic reason can only be seen as one possible intelligent system among many possible others rather than intelligence's necessary and universal conditions",
			source: 'Vincent Lê'
		},
		topics:
			"Patricia and Paul Churchland, Sellars, Chalmers, et al.; p-zombies, sentience, sapience, geist; Donald Hoffman's Interface Theory of Perception and its discontents; Hegel, Brandom, Sellars, Negarestani, Land, socio-semantic v. machinic consistency in intelligent systems; interpretability; Konrad Zuse's Rechnender Raum / Calculating Space to Nick Bostrom's Simulation Hypothesis; Addiction by Design: distraction, hypocognition, amplifiers and suppressors, attention capture, audience capture, addiction maximizers; machine gambling in Las Vegas; ambient intel, information gathering, communication modeling, elicitation, preloading, pretexting, human buffer overflow, microexpressions, persuasion, framing, manipulation, mitigation; centaurs, reverse centaurs, and bossware; bossware v. Para, Tuyal, et al.; reverse centaurs and extractive data labor; the Mechanical Turk to Amazon's Mechanical Turk, chatfarms, labelfarms, the gig economy",
		readings: [
			{
				title: 'The Interface Theory of Perception',
				author: 'Donald Hoffman',
				pdf: 'Donald Hoffman, The Interface Theory of Perception.pdf'
			},
			{
				title: 'from Addiction by Design: Machine Gambling in Las Vegas',
				author: 'Natasha Dow Schüll',
				pdf: 'Natasha Dow Schüll, from Addiction by Design. Machine Gambling in Las Vegas.pdf'
			},
			{
				title: 'from The Reverse Centaur’s Guide to Life After AI',
				author: 'Cory Doctorow',
				pdf: 'Cory Doctorow, from The Reverse Centaurs Guide to Life After AI.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Eliminative Materialism',
				author: 'Paul M. Churchland',
				pdf: 'additional_reading_primary_documents/Paul M. Churchland, from Eliminative materialism.pdf'
			},
			{
				title: 'Spirit in the Crypt: Negarestani vs Land',
				author: 'Vincent Le',
				pdf: 'Vincent Le, Spirit in the Crypt, Negarestani vs Land.pdf'
			},
			{
				title: 'Calculating Space (MIT translation of Rechnender Raum)',
				author: 'Konrad Zuse',
				pdf: 'additional_reading_primary_documents/Konrad Zuse, Calculating Space (MIT translation of Rechnender Raum).pdf'
			}
		],
		lab: {
			topic: 'A word is worth a thousand numbers?',
			items: [
				'Multi-dimensional data, t-SNE, word clouds, tokenization, embeddings, word2vec',
				'Psychology/biochemistry of memory and synaptic connections'
			]
		}
	},
	{
		number: 8,
		date: 'November 9',
		title: 'Police and Thieves',
		epigraph: {
			text: 'The generative model can be thought of as analogous to a team of counterfeiters, trying to produce fake currency and use it without detection, while the discriminative model is analogous to the police, trying to detect the counterfeit currency. Competition in this game drives both teams to improve their methods until the counterfeits are indistinguishable from the genuine articles.',
			source: 'Ian J. Goodfellow, et al.'
		},
		topics:
			"GANs to advanced discriminative models, transformers, and diffusion models; Police and Thieves: SBF, FTX, effective altruism, effective accelerationism, Zizians, et al.; asymmetrical likewar: psyop to mindwar to likewar; hybrid war, asymmetry, and 4GW; Equation Group v. Shadow Brokers: DANDERSPIRITZ, EWOKFRENZY, WANNACRY; exfiltration doxware; Clearview AI, Mainstreet One/People First, Flock/Deflock; memetic warfare, Meta, X, social credit, affective computing, and pseudoPSI; autoasymmetry: the Inversion, bots, celeb followbots; reciprocal panopticism, one-way mirrors, walled gardens, hidden layers; arcana imperii, secretum, mysterium; capture and hidden layers in neural nets; walled gardens, encrypted comms; reciprocal panopticism: Reddit karma and sage, 4chan thread degradation, 8kun-Q and tripcodes; one-way mirrors: DARPA's Lifelog to Facebook, Instagram, Meta; social, political, and economic hidden layers: criminogenic banks, BCCI to In-Q-Tel to Farmington State Bank (Moonstone); Meta captology, BJ Fogg's persuasive computing, and capture",
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
			}
		],
		lab: {
			topic: 'Fool me only once shame on you, fool me into randomness great job',
			items: ['GANs, distillation']
		}
	},
	{
		number: 9,
		date: 'November 16',
		title: 'Hopeium, a hell of a drug',
		topics:
			"Cipherpunks to fintech to DeFi/CeFi/prediction markets and the Finternet; the Caesar Cipher to Enigma, Turing's bombes, and Colossus; MILCRYP, Lambros D. Callimahos, and the Zendian Problem; phreaks, hackers, and goldbugs; David Chaum's Blind Signatures for Untraceable Payments, DigiCash, Tim May's Crypto Anarchist Manifesto, Hashcash, BitGold, Stephenson's Cryptonomicon, AZX, Hollywood Stock Exchange, MT.GOX, Satoshi Nakamoto, et al.; bubbles, AI, NFTs; Polymarket, Kalshi, et al.; Golumbia's Software as Rightwing Extremism; Bitcoinmaxxis, gold-to-Moldbugs; Dogecoin and the birth of the memecoin; LFG! v. FUD; quants, HFT, and dark pools; fintech, the flash crash, ultrafast black swans, and nonhuman temporalities; Mercer: NLP to RenTech to Cambridge Analytica, Breitbart, et al.; DeFi to CeFi to memefi: hodling, Robinhood, Wallstreetbets, Gamestop, $MELANIA; reflexive ponzis: Grayscale, World Liberty Financial, et al.; yield farms, bribefarms: Celsius, 3AC, Terra/Luna, washtrading; crypto and Nash equilibria, zero sum minus, greater fool theory; autocatallaxy, hyper- and hypo-pricing, hyperscaling, circular AI funding, and UBI; On (Surplus) Value In Art: Seth Siegelaub's Artist's Reserved Rights Transfer and Sale Agreement, Diedrich Diederichsen's On (Surplus) Value In Art; NFTs, blockchain, surplus value, and art, second-order use value, surplus extraction, manufactured scarcity, digital scarcity",
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
				title:
					'A Cross-Sectional Analysis of the Hollywood Stock Exchange’s Forecasting Accuracy and Risk vs. Return Relationships',
				author: 'Benjamin A. Olsho',
				pdf: 'additional_reading_primary_documents/Benjamin A. Olsho, A Cross-Sectional Analysis of the Hollywood Stock Exchange.pdf'
			}
		],
		lab: {
			topic: 'Your project',
			items: []
		}
	},
	{
		number: 10,
		date: 'November 23',
		title: 'Machine Decision is Not Final: ‘Humanmade Intelligence’ in China',
		epigraph: {
			text: 'Nature builds no machines, no locomotives, railways, electric telegraphs, self-acting mules etc. These are products of human industry; natural material transformed into organs of the human will over nature, or of human participation in nature. They are organs of the human brain, created by the human hand; the power of knowledge, objectified.',
			source: 'Dai Shanren, quoting Marx from the Grundrisse'
		},
		topics:
			"Humanmade intelligence vs. black technology; the AI garden; What's the Deal with Birds?, Birds Aren't Real: predatory journals, internet hoaxing; hoaxing, Yippies to Yes Men to Birds Aren't Real; art as abstract machine; Deleuze and Guattari's abstract machines, Art as Abstract Machine; first to second order cybernetics, von Foerster, Maturana, Varela, et al.; Sozialeplastik, neuroplastic, abstraction, and the Hack; Honey Pump in the Workplace; hacking v. central processing, aggregation and signal-boost",
		readings: [
			{
				title: 'from Machine Decision Is Not Final',
				author: 'Anna Greenspan, Bogna Konior, Shuang L. Frost',
				pdf: 'Anna Greenspan, Bogna Konior, Shuang L. Frost, from Machine Decision Is Not Final.pdf'
			},
			{
				title: 'What’s the Deal with Birds?',
				author: 'Daniel T. Baldassarre',
				pdf: "Daniel T. Baldassarre, What's the deal with birds 2020.pdf"
			},
			{
				title: 'Art as Abstract Machine',
				author: 'Stephen Zepke',
				pdf: 'Stephen Zepke, Introduction, Art as Abstract Machine_ Ontology and Aesthetics in Deleuze and Guattari.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'The Method of Levels of Abstraction',
				author: 'Luciano Floridi',
				pdf: 'additional_reading_primary_documents/Luciano Floridi, The method of levels of abstraction.pdf'
			}
		],
		lab: {
			topic: 'Your project',
			items: []
		}
	},
	{
		number: 11,
		date: 'November 30',
		title: 'Interlocks, Cognitive Hierarchies, Rhizomatics',
		epigraph: {
			text: '(Heterarchy is) an emergent organizational form with distinctive network properties … and multiple organizing principles.',
			source: 'David Stark'
		},
		topics:
			"Interlocks, Mark Lombardi, A Cognitive Hierarchy Model of Games, heterarchy, rhizomatics; information hierarchies: data silos, info silos; Aaron Swartz's Guerilla Open Access Manifesto, JSTOR, and academic journals; Substack, Patreon, dark/walled servers, aaaaarg, et al.; Slashdot, Hacker News, Stack Overflow, et al.; compartmentalization, fusion centers, and desiloing; Lulzsec to Nulzsec: digital activism left and right, CCC, Legion of Doom, cDc/Hacktivismo, Anonymous, Lulzsec, AnonOps, Anontools, Back Orifice, LOIC; Internet Research Agency, Council for National Policy, The Family, et al.; chans and occult memetics, Pepe, Kek, et al., /pol to Q; right metapolitics; left/right can't meme; narrative laundering; Fog Reveal v. Chaff, Pegasus v. Predator; obfuscation, false tells, making analysis inefficient, babble tapes, Operation Vula, quote stuffing, hydras, Vortex, Bayesian flooding and unselling, FaceCloak; exploits and asymmetry; Fog Reveal, ECHELON, warrantless mass surveillance, fusion centers, et al.; fogging, flooding, and surfacing, amplification, inhibition, wiping; Pegasus vs. Predator, Cytex, Intellexa, NSO Group, and mercenary spyware",
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
				title: 'Guerilla Open Access Manifesto',
				author: 'Aaron Swartz',
				pdf: 'additional_reading_primary_documents/Aaron Swartz, Guerilla Open Access Manifesto.pdf'
			},
			{
				title: 'Fogging and Flooding: Countering Extremist Mis/Disinformation After Terror Attacks',
				author: 'GNET Report',
				pdf: 'additional_reading_primary_documents/GNET-Report-Fogging-And-Flooding-Countering-Extremist-MisDisinformation-After-Terror-Attacks.pdf'
			}
		],
		lab: {
			topic: 'Your project',
			items: []
		}
	},
	{
		number: 12,
		date: 'December 7',
		title: 'Rewiring Social Structure',
		epigraph: {
			text: "I must Create a System, or be enslav'd by another Mans / I will not Reason and Compare; my business is to Create",
			source: 'William Blake'
		},
		topics:
			"Vogt's Rituals of Reversal as a Means of Rewiring Social Structure; rewiring as always already happening: social media and social structure; algorithmic austerity v. Red Plenty and Cybersyn; very slow AIs to algorithmic value capture devices, a reprise; Dator and Candy's possibility vs. probability space; Parasites Lost; David Roden, Posthuman Life and Subtractive-Catastrophic Xenophilia; demontology; Accelerando's Lobster AIs, MIT's Norman, Zero HP Lovecraft's Minotaur, Cthulhu AI; Claire Colebrook's In Praise of the Flat Earth and counterethics, Zoe v. Bios; ethical AI, game theory, and defection; Isabel Millar, The Psychoanalysis of Artificial Intelligence; a thorough rugging: exit scams, rugging, the Big Rugpull",
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
			}
		],
		lab: {
			topic: 'Present your project',
			items: []
		}
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
