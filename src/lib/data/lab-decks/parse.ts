// Parser for the lab-deck markdown files in this directory. Each file is one
// lab: front matter (number/title/stance/blurb), then slides separated by
// `---` lines, each slide opening with a kind marker like `@prose`. See
// README.md here for the full format. Errors name the file and slide so a
// typo surfaces as a readable build message, not a broken deck.

export type Slide =
	// Opening card. One per deck, first.
	| { kind: 'title'; eyebrow?: string; title: string; subtitle?: string }
	// A single sentence, set large. The unit of a projected argument.
	| { kind: 'statement'; text: string; note?: string }
	// Heading plus a paragraph or three. The reading-voice slide.
	| { kind: 'prose'; heading?: string; body: string[] }
	// Enumerated points or steps. Ordered when written as 1. 2. 3.
	| { kind: 'list'; heading?: string; items: string[]; ordered?: boolean }
	| { kind: 'quote'; text: string; source: string }
	| { kind: 'image'; src: string; alt: string; caption?: string }
	// A clip, muted and looping on the projector. Same ![alt](src) line as @image.
	| { kind: 'video'; src: string; alt: string; caption?: string }
	// Live thing to open — an interactive page on this site, or an outside
	// tool. Steps are what to actually do with it while it's up.
	| { kind: 'demo'; heading: string; body?: string; href: string; label: string; steps?: string[] }
	// What students make. Last, usually.
	| {
			kind: 'prompt';
			heading: string;
			body?: string;
			items?: string[];
			deliverable?: string;
	  };

export interface Lab {
	/** Matches the syllabus week number. */
	number: number;
	title: string;
	/** The stance this lab takes toward the apparatus — see lab-planning/. */
	stance: string;
	/** One line, for the lab index and the week page. */
	blurb: string;
	/**
	 * Unpublished. Draft decks are served in dev and to instructors; in
	 * production they 404 for everyone else and their text is never sent to
	 * the browser. Set with `draft: true` in the file's front matter.
	 */
	draft?: boolean;
	slides: Slide[];
}

const KINDS = ['title', 'statement', 'prose', 'list', 'quote', 'image', 'video', 'demo', 'prompt'];

export function parseLab(src: string, path = 'lab deck'): Lab {
	const fail = (msg: string, slideNo?: number): never => {
		throw new Error(`${path}${slideNo ? ` slide ${slideNo}` : ''}: ${msg}`);
	};

	const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!fm) fail('missing front matter (a --- block at the very top)');
	const meta: Record<string, string> = {};
	for (const line of fm![1].split(/\r?\n/)) {
		const m = line.match(/^(\w+):\s*(.*)$/);
		if (m) meta[m[1]] = m[2].trim();
	}
	for (const key of ['number', 'title', 'stance', 'blurb']) {
		if (!meta[key]) fail(`front matter needs a "${key}:" line`);
	}

	const chunks = src
		.slice(fm![0].length)
		.split(/^\s*---\s*$/m)
		.map((c) => c.trim())
		.filter(Boolean);
	if (chunks.length === 0) fail('no slides found after the front matter');

	const slides = chunks.map((chunk, i) => parseSlide(chunk, i + 1, fail));
	const lab: Lab = {
		number: Number(meta.number),
		title: meta.title,
		stance: meta.stance,
		blurb: meta.blurb,
		slides
	};
	if (/^(true|yes)$/i.test(meta.draft ?? '')) lab.draft = true;
	return lab;
}

function parseSlide(
	chunk: string,
	n: number,
	fail: (msg: string, slideNo?: number) => never
): Slide {
	const lines = chunk.split(/\r?\n/);
	const marker = lines.shift()!.trim();
	if (!marker.startsWith('@')) {
		fail(
			`each slide must open with a kind marker (@prose, @demo, …); got "${marker.slice(0, 40)}"`,
			n
		);
	}
	const kind = marker.slice(1).trim();
	if (!KINDS.includes(kind)) fail(`unknown slide kind "@${kind}" (one of: ${KINDS.join(', ')})`, n);

	// Pull out the structural lines; whatever remains becomes paragraphs.
	const fields: Record<string, string> = {};
	let heading: string | undefined;
	let link: { label: string; href: string } | undefined;
	let image: { alt: string; src: string } | undefined;
	const quoteLines: string[] = [];
	let source: string | undefined;
	const items: string[] = [];
	let ordered = false;
	const paraLines: string[] = [];

	for (const raw of lines) {
		const line = raw.trim();
		const field = line.match(/^(eyebrow|note|caption|deliverable):\s*(.*)$/);
		const item = line.match(/^(?:[-*]|(\d+)\.)\s+(.*)$/);
		if (field) {
			fields[field[1]] = field[2];
		} else if (line.startsWith('## ') || line.startsWith('# ')) {
			heading = line.replace(/^#+\s*/, '');
		} else if (/^!\[.*\]\(.+\)$/.test(line)) {
			const m = line.match(/^!\[(.*)\]\((.+)\)$/)!;
			image = { alt: m[1], src: m[2] };
		} else if (/^\[.+\]\(.+\)$/.test(line)) {
			const m = line.match(/^\[(.+)\]\((.+)\)$/)!;
			link = { label: m[1], href: m[2] };
		} else if (line.startsWith('> ')) {
			quoteLines.push(line.slice(2));
		} else if (line.startsWith('— ')) {
			source = line.slice(2);
		} else if (item) {
			if (items.length === 0) ordered = Boolean(item[1]);
			items.push(item[2]);
		} else {
			paraLines.push(raw);
		}
	}

	// Blank-line-separated paragraphs; single newlines inside one stay a wrap.
	const paras = paraLines
		.join('\n')
		.split(/\n\s*\n/)
		.map((p) => p.replace(/\s+/g, ' ').trim())
		.filter(Boolean);

	switch (kind) {
		case 'title': {
			if (!heading) fail('a @title slide needs a "# Title" line', n);
			const s: Slide = { kind: 'title', title: heading! };
			if (fields.eyebrow) s.eyebrow = fields.eyebrow;
			if (paras.length) s.subtitle = paras.join(' ');
			return s;
		}
		case 'statement': {
			if (!paras.length) fail('a @statement slide needs its sentence', n);
			const s: Slide = { kind: 'statement', text: paras.join(' ') };
			if (fields.note) s.note = fields.note;
			return s;
		}
		case 'prose': {
			if (!paras.length) fail('a @prose slide needs at least one paragraph', n);
			const s: Slide = { kind: 'prose', body: paras };
			if (heading) s.heading = heading;
			return s;
		}
		case 'list': {
			if (!items.length) fail('a @list slide needs "- item" or "1. item" lines', n);
			const s: Slide = { kind: 'list', items };
			if (heading) s.heading = heading;
			if (ordered) s.ordered = true;
			return s;
		}
		case 'quote': {
			if (!quoteLines.length) fail('a @quote slide needs "> quoted text" lines', n);
			if (!source) fail('a @quote slide needs a "— Source" line', n);
			return { kind: 'quote', text: quoteLines.join(' '), source: source! };
		}
		case 'image': {
			if (!image) fail('an @image slide needs an ![alt](src) line', n);
			const s: Slide = { kind: 'image', src: image!.src, alt: image!.alt };
			if (fields.caption) s.caption = fields.caption;
			return s;
		}
		case 'video': {
			if (!image) fail('a @video slide needs an ![alt](src) line', n);
			const s: Slide = { kind: 'video', src: image!.src, alt: image!.alt };
			if (fields.caption) s.caption = fields.caption;
			return s;
		}
		case 'demo': {
			if (!heading) fail('a @demo slide needs a "## Heading" line', n);
			if (!link) fail('a @demo slide needs a "[Button label](href)" line', n);
			const s: Slide = { kind: 'demo', heading: heading!, href: link!.href, label: link!.label };
			if (paras.length) s.body = paras.join(' ');
			if (items.length) s.steps = items;
			return s;
		}
		case 'prompt': {
			if (!heading) fail('a @prompt slide needs a "## Heading" line', n);
			const s: Slide = { kind: 'prompt', heading: heading! };
			if (paras.length) s.body = paras.join(' ');
			if (items.length) s.items = items;
			if (fields.deliverable) s.deliverable = fields.deliverable;
			return s;
		}
	}
	return fail(`unhandled kind "@${kind}"`, n);
}
