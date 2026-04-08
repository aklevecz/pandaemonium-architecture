export interface Reading {
	title: string;
	author: string;
	pdf: string;
}

export interface Week {
	number: number;
	date: string;
	title: string;
	epigraph: { text: string; source: string };
	topics: string;
	readings: Reading[];
	additionalReadings: Reading[];
	lab: string;
}

export const courseInfo = {
	title: 'Pandaemonium Architecture 6.0',
	code: 'ATEK-639/439',
	semester: 'Fall 2025',
	instructor: 'Scott Benzel',
	schedule: 'Mondays 1-3:50 A211H',
	description: `This course examines whether artists employing machine learning, generative algorithms, predictive models, and other technics\u2014tools of what Deleuze called \u201cthe Societies of Control\u201d\u2014can make art that is evocative, powerful, critical, perhaps even socially transformative.`,
	epigraphs: [
		{
			text: 'Whatever else AI is, it is not neutral, and neither can we be. AI is political because it acts in the world in ways that affect the distribution of power, and its political tendencies are revealed in the ways that it sets up boundaries and separations. The apparatus of AI forms feedback loops with the rest of society: it\u2019s \u201ca structured structure that becomes a structuring structure\u201d (Bourdieu, 1980)',
			source: 'Dan McQuillan, Resisting AI, an Anti-fascist Approach to Artificial Intelligence'
		},
		{
			text: '\u2026rituals of reversal\u2026\u201crewire\u201d the crucial connections in the social structure by providing symbolic statements of traditional social imperatives and basic categories of\u2026world view.',
			source:
				'Evon Z. Vogt, Rituals of Reversal as a Means of Rewiring Social Structure'
		}
	]
};

export const introductoryReadings: Reading[] = [
	{
		title: 'The Cybernetic Hypothesis',
		author: 'Tiqqun',
		pdf: 'Tiqqun - The Cybernetic Hypothesis (2001).pdf'
	},
	{
		title: 'from Resisting AI, an Anti-fascist Approach to Artificial Intelligence',
		author: 'Dan McQuillan',
		pdf: 'Dan McQuillan from Resisting AI_ An Anti-fascist Approach to Artificial Intelligence-Bristol University Press (2022).pdf'
	}
];

export const weeks: Week[] = [
	{
		number: 1,
		date: 'September 8',
		title: 'A grin without a cat',
		epigraph: {
			text: 'Information does not exist, it is a useless notion in biology\u2026 It is a useful notion for design for understanding systems that are very well specified, you may describe relations in these terms but living systems do not operate in those terms.',
			source: 'Humberto Maturana'
		},
		topics:
			'A cybernetic system; the para-real and the propaganda model; TESCREAL, Libidinal Materialism, and AGI; Part-Artilects, Cosmism to AGI; Attention is all you need \u2014 self-attention and transformers; the Attention Economy; O.G. Selfridge, Paradise Lost, and Pandaemonium Architecture; von Neumann, cellular automata, and self-replicating machines; Conway\u2019s Game of Life; cybernetics and Marcel Duchamp\u2019s The Creative Act',
		readings: [
			{
				title: 'Human-Computer Interaction Design and the Cybersemiotic Experience',
				author: 'Claudia Jacques',
				pdf: 'Claudia Jacques, Human-Computer Interaction Design and the Cybersemiotic Experience.pdf'
			},
			{
				title: 'Notes on \u00C0 bruit secret: on Duchamp, Cybernetics, and Organized Crime',
				author: 'Scott Benzel',
				pdf: 'Notes on \u00C0 bruit secret_ Notes on Duchamp, Cybernetics, CIA, and Organized Crime.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Pandemonium: A Paradigm For Learning',
				author: 'O.G. Selfridge',
				pdf: 'additional_reading_primary_documents/O.G. Selfridge, PANDEMONIUM_ A PARADIGM FOR LEARNING.pdf'
			},
			{
				title: 'Attention is all you need',
				author: 'Illia Polosukhin, et al.',
				pdf: 'additional_reading_primary_documents/Illia Polosukhin, et al, Attention is all you need 1706.03762v7.pdf'
			},
			{
				title: 'The TESCREAL bundle: Eugenics and the promise of utopia through artificial general intelligence',
				author: 'Timnit Gebru and \u00C9mile P. Torres',
				pdf: 'additional_reading_primary_documents/Timnit Gebru and Emile P. Torres, The TESCREAL bundle_ Eugenics and the promise of utopia through artificial general intelligence.pdf'
			}
		],
		lab: 'Generative/toy AI: Golly, Koan to Wotja, et al; latent diffusion models and transformers'
	},
	{
		number: 2,
		date: 'September 15',
		title: 'Shoggoth with a Smiley Face',
		epigraph: {
			text: 'Negative Capability, that is, when a man is capable of being in uncertainties, mysteries, doubts, without any irritable reaching after fact and reason.',
			source: 'John Keats'
		},
		topics:
			'Zairja, Llull, Leibniz, Lovelace, Lovecraft\u2019s Shoggoth; inevitable/evitable, lock in, path dependency; AI, Negative Capability, and the Black Box; Technocracy Inc., the Hollerith Tabulator, IBM; Claude Shannon\u2019s information theory; The Californian Ideology; Basilisks; First to Second Order Cybernetics; Antimemetics, the SCP Foundation; internet balkanization, Cozyweb v. Dark Forest',
		readings: [
			{
				title: 'There is no Antimemetics Division',
				author: 'qntm',
				pdf: 'qntm, There Is No Antimemetics Division.pdf'
			},
			{
				title: 'Antimemetics: Why Some Ideas Resist Spreading',
				author: 'Nadia Asparouhova',
				pdf: 'Nadia Asparouhova, from Antimemetics_ Why Some Ideas Resist Spread.pdf'
			},
			{
				title: 'Notes on Thinking Machine Imaginaries: Llull, Leibniz, and Lovelace to \u2018Shoggoth with a Smiley Face\u2019',
				author: 'Scott Benzel',
				pdf: "Notes on Thinking Machine Imaginaries_ Llull, Leibniz, and Lovelace to 'Shoggoth with a Smiley Face'.pdf"
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
				title: 'from Extreme Privacy: What It Takes to Disappear',
				author: 'Michael Bazzell',
				pdf: 'additional_reading_primary_documents/Michael Bazzell -  from Extreme privacy what it takes to disappear (2020).pdf'
			}
		],
		lab: 'Introduction to Colab/Python, Hugging Face, GitHub, et al'
	},
	{
		number: 3,
		date: 'September 22',
		title: 'Degrade the Threads',
		epigraph: {
			text: 'We\u2019re all living through the enshittocene, a great enshittening, in which the services that matter to us, that we rely on, are turning into giant piles of shit.',
			source: 'Cory Doctorow'
		},
		topics:
			'Enshittification; consensus reality vs. burbclaves; devolution, slurp juice, mutation, degens, degraded threads; AI slopworld and Baudrillard\u2019s Evil Demon of Images; New Memory, the (a)Social (de)Construction of Reality; Edward Bernays, propaganda; social engineering, parasociality; Philip K. Dick, Simulationism; the Simulation Hypothesis; Cambridge Analytica; RenTech, NLP, and LLMs; recursion and backpropagation in ML',
		readings: [
			{
				title: 'Speedrunning Through The Language-Game',
				author: 'Adam Elkus',
				pdf: 'Adam Elkus, Speedrunning Through The Language-Game.pdf'
			},
			{
				title: 'The Evil Demon of Images',
				author: 'Jean Baudrillard',
				pdf: 'Jean Baudrillard, The evil demon of images, 1987.pdf'
			},
			{
				title: 'Notes on New Memory, the Wood between Worlds',
				author: 'Scott Benzel',
				pdf: 'Notes on New Memory - Scott Benzel.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Too big to care: Enshittification is a choice',
				author: 'Cory Doctorow',
				pdf: 'additional_reading_primary_documents/Cory Doctorow, Too big to care. Enshittification is a choice. _ by Cory Doctorow _ Medium.pdf'
			}
		],
		lab: 'LLMs: local LLMs, ChatGPT, et al, coding with LLMs'
	},
	{
		number: 4,
		date: 'September 29',
		title: 'A Pervasive Global Cognitive Automaton',
		epigraph: {
			text: 'Contemporary AI systems are now becoming human-competitive at general tasks and we must ask ourselves: Should we let machines flood our information channels with propaganda and untruth?',
			source: 'Open letter from tech CEOs suggesting an AI moratorium'
		},
		topics:
			'Planetary computation: platform, stack, model, machine; Charles Stross\u2019 \u201cvery slow AIs\u201d; Trapwire, Predpol, Palantir, and pernicious feedback loops; memesis, thought contagion, and stochastic terror; Foxacid, Quantumsquirrel, Weeping Angel; Lyotard\u2019s Libidinal Economy v. Tiqqun\u2019s Cybernetic Hypothesis; Mark Fisher\u2019s Capitalist Realism to Acid Communism',
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
				title: 'Speculations Concerning the First Ultraintelligent Machine',
				author: 'I.J. Good',
				pdf: 'additional_reading_primary_documents/I.J. Good, Speculations Concerning the First Ultraintelligent Machine complete.pdf'
			},
			{
				title: 'Cosmic Evolution from Cosmos and Culture',
				author: 'Steven J. Dick',
				pdf: 'additional_reading_primary_documents/Steven J. Dick,  from Cosmos & Culture_ Cultural Evolution in a Cosmic Context-US National Aeronautics and Space Admin (2010).pdf'
			}
		],
		lab: 'Copilot, Cursor, encapsulation'
	},
	{
		number: 5,
		date: 'October 6',
		title: 'Young Slime Life',
		epigraph: {
			text: 'Cells that fire together, wire together.',
			source: 'Folk saying'
		},
		topics:
			'Swarm v. Slime Dynamics: Agent v. Swarm v. Protean Ooze; David Roden and Posthuman Life; Karen Barad, Agential Realism; Polybius by Sinnesl\u00F6schen, Nitro Zeus; cyberkinetic/rumor warfare; Frank Rosenblatt and the Perceptron; Marvin Minsky and Seymour Papert\u2019s Perceptrons; Scalars, Vectors, Decision Trees, Entropy splits',
		readings: [
			{
				title: 'from Swarm Intelligence: From Natural to Artificial Systems',
				author: 'Eric Bonabeau et al.',
				pdf: 'Eric Bonabeau et al, from Swarm intelligence from natural to artificial systems.pdf'
			},
			{
				title: 'Agential Realism, from Meeting the Universe Halfway',
				author: 'Karen Barad',
				pdf: 'Karen Barad, Agential Realism from Meeting the universe halfway_ quantum physics and the entanglement of matter and meaning  -Duke University Press (2007).pdf'
			},
			{
				title: 'Notes on Polybius by Sinnesl\u00F6schen, Nitro Zeus',
				author: 'Scott Benzel',
				pdf: 'Notes on Polybius by Sinnesl\u00F6schen, Nitro Zeus - Scott Benzel.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'from Slime Dynamics',
				author: 'Ben Woodard',
				pdf: 'additional_reading_primary_documents/Ben Woodard, from Slime Dynamics.pdf'
			},
			{
				title: 'from Perceptrons: An Introduction to Computational Geometry',
				author: 'Minsky and Papert',
				pdf: 'additional_reading_primary_documents/Minsky, Papert - from Perceptrons_ An Introduction to Computational Geometry.pdf'
			}
		],
		lab: 'Particle systems, Unreal Engine, others'
	},
	{
		number: 6,
		date: 'October 20',
		title: 'Young-Grrrl War-Machine, The Cyberfeminism Index',
		epigraph: {
			text: 'Hustling simps has been an art since the beginning of time!',
			source: 'Think Expansion'
		},
		topics:
			'Alex Quicho\u2019s Everyone is a Girl Online; The Cyberfeminism Index; D&D to MUDs to MMORPGs, ARGs to dreampolitik; Cicada 3301, gamejacking, occult memetics; C. Thi Nguyen, Games, Agency as Art; Gamergate and algorithmic radicalization; APTs: Fancy Bear; opsec, exploits, zero days; Anonymous, Wikileaks',
		readings: [
			{
				title: 'Everyone is a Girl Online',
				author: 'Alex Quicho',
				pdf: 'Alex Quicho, Everyone Is a Girl Online WIRED.pdf'
			},
			{
				title: 'from Cyberfeminism Index',
				author: 'Mindy Seu (editor)',
				pdf: 'Mindy Seu (editor) - from Cyberfeminism Index.pdf'
			},
			{
				title: 'from Social Engineering: The Science of Human Hacking',
				author: 'Christopher Hadnagy',
				pdf: 'Christopher Hadnagy, from Social Engineering The Science of Human Hacking.pdf'
			}
		],
		additionalReadings: [],
		lab: 'Game engines, Godot Engine, et al.'
	},
	{
		number: 7,
		date: 'October 27',
		title: 'Eliminative Materialism and Neurophilosophy',
		epigraph: {
			text: 'If you look at the monopolistic firm as an example of a maximum system, you can connect up its structural relations with those that prevail for an entropy-maximizing thermodynamic system.',
			source: 'Paul A. Samuelson'
		},
		topics:
			'Patricia and Paul Churchland, Sellars, Chalmers; p-zombies, sentience, sapience, geist; Hoffman\u2019s Interface Theory of Perception; Addictionmaxxing \u2014 hypocognition v. hypercognition; attention capture, audience capture, addiction maximizers; Bossware v. Chickenized Reverse Centaurs; extractive data labor',
		readings: [
			{
				title: 'from Addiction by Design: Machine Gambling in Las Vegas',
				author: 'Natasha Dow Sch\u00FCll',
				pdf: 'Natasha Dow Sch\u00FCll, from Addiction by Design. Machine Gambling in Las Vegas.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'from Eliminative Materialism and the Propositional Attitudes',
				author: 'Paul M. Churchland',
				pdf: 'additional_reading_primary_documents/Paul M. Churchland, from Eliminative materialism.pdf'
			}
		],
		lab: 'Generative AI imagemaking, photobashing, improving prompted imagery'
	},
	{
		number: 8,
		date: 'November 3',
		title: 'Art as Abstract Machine',
		epigraph: {
			text: 'Any piece of flotsam or jetsam within our grasp should be considered as a precipitate of our desire.',
			source: 'Andr\u00E9 Breton'
		},
		topics:
			'Deleuze and Guattari\u2019s abstract machines; Zepke\u2019s Art as Abstract Machine, Levelism in art; Police and Thieves \u2014 Generative Adversarial Nets; GANs to diffusion models; Reciprocal Panopticism: one-way mirrors, walled gardens, hidden layers; DARPA\u2019s Lifelog to Meta; Facebook/Meta Captology, BJ Fogg\u2019s Persuasive Computing',
		readings: [
			{
				title: 'Introduction, Art as Abstract Machine: Ontology and Aesthetics in Deleuze and Guattari',
				author: 'Stephen Zepke',
				pdf: 'Stephen Zepke, Introduction, Art as Abstract Machine_ Ontology and Aesthetics in Deleuze and Guattari.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'Generative Adversarial Nets',
				author: 'Ian J. Goodfellow, et al.',
				pdf: 'additional_reading_primary_documents/Ian Goodfellow, et al., Generative Adversarial Nets.pdf'
			},
			{
				title: 'from Persuasive Technology: Using Computers to Change What We Think and Do',
				author: 'BJ Fogg',
				pdf: 'additional_reading_primary_documents/BJ Fogg, from Persuasive technology_ using computers to change what we think and do.pdf'
			}
		],
		lab: 'Runway, Sora, et al. generative video'
	},
	{
		number: 9,
		date: 'November 10',
		title: 'Hopeium, a hell of a drug',
		epigraph: {
			text: 'Birds are very strange. Some people are like \u201cwhoa they\u2019re flying around and stuff, what\u2019s the deal with that?\u201d This sentiment is shared by people across socioeconomic backgrounds.',
			source:
				'Daniel T. Baldessarre, What\u2019s the Deal with Birds?'
		},
		topics:
			'Cipherpunks to Fintech to DeFi/CeFi; the Caesar Cipher to Enigma, Turing\u2019s bombes; David Chaum, DigiCash, Tim May\u2019s Crypto Anarchist Manifesto; Satoshi Nakamoto; Bubbles: AI, Metaverse, NFTs, crypto; quants, HFT, and dark pools; Robert Mercer: NLP to RenTech to Cambridge Analytica; On (Surplus) Value In Art; predatory journals and internet hoaxing',
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
			},
			{
				title: 'What\u2019s the Deal with Birds?',
				author: 'Daniel T. Baldassarre',
				pdf: "Daniel T. Baldassarre, What's the deal with birds? 2020.pdf"
			}
		],
		additionalReadings: [
			{
				title: 'from Military Cryptanalytics Pt. 3',
				author: 'Lambros D. Callimahos',
				pdf: 'additional_reading_primary_documents/Lambros D. Callimahos, from Military Cryptanalytics Pt3 1977.pdf'
			},
			{
				title: 'from Bitcoin, Software as Rightwing Extremism',
				author: 'David Golumbia',
				pdf: 'additional_reading_primary_documents/David Golumbia, from Bitcoin, software as rightwing extremism.pdf'
			}
		],
		lab: 'Generative sound, sonification, AI without prompts'
	},
	{
		number: 10,
		date: 'November 17',
		title: 'Metaruins',
		epigraph: {
			text: 'Abstraction reflected the economic mechanization of consciousness.',
			source: 'Meyer Shapiro'
		},
		topics:
			'XR SF: Neuromancer\u2019s Cyberspace, Snow Crash\u2019s Metaverse, Ready Player One\u2019s Oasis; David Chalmers\u2019 Reality+; Sugarscape, Life with the Artificial Anasazi; the Interface Theory of Perception v. the Simulation Hypothesis; Girard\u2019s Mimetic Violence; Kant\u2019s antinomies of pure reason; Levelism: epistemological, ontological, methodological, abstraction',
		readings: [
			{
				title: 'The Interface Theory of Perception',
				author: 'Donald Hoffman',
				pdf: 'Donald Hoffman, The Interface Theory of Perception.pdf'
			},
			{
				title: 'Are You Living In A Computer Simulation?',
				author: 'Nick Bostrom',
				pdf: 'Nick Bostrom, ARE YOU LIVING IN A COMPUTER SIMULATION?.pdf'
			},
			{
				title: 'Mimesis, Violence, and Facebook: Peter Thiel\u2019s French Connection',
				author: 'Geoff Shullenberger',
				pdf: 'Geoff Shullenberger, Mimesis, Violence, and Facebook_ Peter Thiels French Connection.pdf'
			}
		],
		additionalReadings: [
			{
				title: 'The Method of Levels of Abstraction',
				author: 'Luciano Floridi',
				pdf: 'additional_reading_primary_documents/Luciano Floridi, The method of levels of abstraction.pdf'
			},
			{
				title: 'Life with the Artificial Anasazi',
				author: 'Jared Diamond',
				pdf: 'additional_reading_primary_documents/Jared Diamond, Life with the artificial Anasazi.pdf'
			}
		],
		lab: 'Work on your project'
	},
	{
		number: 11,
		date: 'November 24',
		title: 'Lulzsec to Nulzsec',
		epigraph: {
			text: '(Heterarchy is) an emergent organizational form with distinctive network properties\u2026 and multiple organizing principles.',
			source: 'Stark'
		},
		topics:
			'Digital activism, left and right; CCC, Legion of Doom, Anonymous, Lulzsec; Internet Research Agency; chans and occult memetics, Pepe, Kek, /pol to QAnon; narrative laundering; Mark Lombardi, Interlocks, cognitive hierarchies, heterarchy, rhizomatics; Chaff v. Fog Reveal, Pegasus v. Predator; obfuscation, Bayesian flooding; mercenary spyware',
		readings: [
			{
				title: 'The Gamification of Conspiracy: QAnon as ARG',
				author: 'Hugh Davies',
				pdf: 'Hugh Davies, The Gamification of Conspiracy QAnon as ARG.pdf'
			},
			{
				title: 'from Obfuscation: A User\u2019s Guide for Privacy and Protest',
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
				title: 'A Cognitive Hierarchy Theory of Games',
				author: 'Colin F. Camerer, Teck-Hua Ho, et al.',
				pdf: 'additional_reading_primary_documents/COLIN F. CAMERER TECK-HUA HO JUIN-KUAN CHONG, Cognitive Hierarchy Theory of Games.pdf'
			},
			{
				title: 'Fogging and Flooding: Countering Extremist Mis/Disinformation After Terror Attacks',
				author: 'GNET Report',
				pdf: 'additional_reading_primary_documents/GNET-Report-Fogging-And-Flooding-Countering-Extremist-MisDisinformation-After-Terror-Attacks.pdf'
			}
		],
		lab: 'Work on your project'
	},
	{
		number: 12,
		date: 'December 1',
		title: 'Asymmetrical Likewar to Autoasymmetry',
		epigraph: {
			text: 'Do you really think SF Capital allows monkey flake to make decisions it classifies as important?',
			source: 'CCRU'
		},
		topics:
			'Psyop to Mindwar to Likewar; hybrid war, asymmetry, and 5GW; Equation Group v. Shadow Brokers; Memetic Warfare, affective computing; Autoasymmetry; Rewiring Social Structure; SF Capital, Hype-vorticism, beclownment, lulz; Nguyen\u2019s Games, Agency as Art',
		readings: [
			{
				title: 'SF Capital',
				author: 'Mark Fisher',
				pdf: 'Mark Fisher, SF Capital.pdf'
			},
			{
				title: 'from Games: Agency As Art',
				author: 'C. Thi Nguyen',
				pdf: 'C. Thi Nguyen - from Games_ Agency As Art-Oxford University Press (2020).pdf'
			}
		],
		additionalReadings: [
			{
				title: 'On Social Sadism',
				author: 'China Mieville',
				pdf: 'additional_reading_primary_documents/China Mieville, On Social Sadism - Salvage.pdf'
			},
			{
				title: 'Rituals of Reversal as a Means of Rewiring Social Structure',
				author: 'Evon Z. Vogt',
				pdf: 'additional_reading_primary_documents/Evon Z. Vogt, Rituals of Reversal as a Means of Rewiring Social Structure.pdf'
			}
		],
		lab: 'Work on your project / present projects'
	},
	{
		number: 13,
		date: 'December 8',
		title: 'Parasites Lost',
		epigraph: {
			text: 'I must Create a System, or be enslav\u2019d by another Mans / I will not Reason and Compare; my business is to Create.',
			source: 'William Blake'
		},
		topics:
			'David Roden, Posthuman Life and Subtractive-Catastrophic Xenophilia, demontology; Accelerando\u2019s Lobster AIs, MIT\u2019s Norman, Zero HP Lovecraft\u2019s Minotaur; Claire Colebrook\u2019s counterethics, Zoe v. Bios; ethical AI, game theory, and defection; Isabel Millar, The Psychoanalysis of Artificial Intelligence; exit scams, rugging, The Big Rugpull',
		readings: [
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
				title: 'A Globe of One\u2019s Own, In Praise of the Flat Earth',
				author: 'Claire Colebrook',
				pdf: 'additional_reading_primary_documents/Claire Colebrook, A Globe of Ones Own.pdf'
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
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return '/reading/' + slug;
}
