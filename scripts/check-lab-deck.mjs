#!/usr/bin/env node
// Checks a lab deck the way the site will read it, plus the things the parser
// does not care about but the room does: a demo button that goes nowhere, a
// picture that is not in static/, an em dash in course prose.
//
//   node scripts/check-lab-deck.mjs lab-03
//   node scripts/check-lab-deck.mjs            # every deck
//
// Exits non-zero on a problem, so it can gate a commit.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseLab } from '../src/lib/data/lab-decks/parse.ts';

const DECKS = 'src/lib/data/lab-decks';
const names = process.argv[2]
	? [process.argv[2].replace(/\.md$/, '')]
	: readdirSync(DECKS)
			.filter((f) => /^lab-\d+\.md$/.test(f))
			.map((f) => f.replace(/\.md$/, ''));

// An internal href resolves if some route folder matches its path. Dynamic
// segments ([num], [slug]) are accepted without checking the value.
function routeExists(href) {
	const path = href.split(/[?#]/)[0].replace(/^\/|\/$/g, '');
	if (!path) return true;
	let dir = 'src/routes';
	for (const part of path.split('/')) {
		const entries = existsSync(dir) ? readdirSync(dir) : [];
		const next = entries.includes(part) ? part : entries.find((e) => /^\[.+\]$/.test(e));
		if (!next) return false;
		dir = join(dir, next);
	}
	return existsSync(join(dir, '+page.svelte')) || existsSync(join(dir, '+server.ts'));
}

let failed = false;
for (const name of names) {
	const file = join(DECKS, `${name}.md`);
	if (!existsSync(file)) {
		console.error(`${name}: no such deck (${file})`);
		failed = true;
		continue;
	}
	const problems = [];
	let lab;
	try {
		lab = parseLab(readFileSync(file, 'utf8'), file);
	} catch (err) {
		console.error(`${name}: ${err.message}`);
		failed = true;
		continue;
	}

	const kinds = {};
	lab.slides.forEach((s, i) => {
		const n = i + 1;
		kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
		if (s.kind === 'demo' && s.href.startsWith('/') && !routeExists(s.href))
			problems.push(`slide ${n}: demo button goes to ${s.href}, which is not a page on the site`);
		if ((s.kind === 'image' || s.kind === 'video') && s.src.startsWith('/') && !existsSync(join('static', s.src)))
			problems.push(`slide ${n}: ${s.src} is not in static/`);
		if ((s.kind === 'image' || s.kind === 'video') && !s.alt.trim())
			problems.push(`slide ${n}: the ${s.kind} has no alt text`);
		// Course prose uses no em dashes. A quotation is someone else's prose,
		// and its source line opens with one by design.
		if (s.kind !== 'quote') {
			const text = JSON.stringify({ ...s, kind: undefined });
			if (text.includes('—')) problems.push(`slide ${n}: em dash in the text`);
		}
	});
	if (lab.slides[0]?.kind !== 'title') problems.push('slide 1 should be the @title slide');

	const summary = Object.entries(kinds)
		.map(([k, c]) => `${c} ${k}`)
		.join(', ');
	console.log(`${name}: ${lab.slides.length} slides (${summary})${lab.draft ? ' · draft' : ' · PUBLISHED'}`);
	for (const p of problems) console.log(`  ! ${p}`);
	if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
