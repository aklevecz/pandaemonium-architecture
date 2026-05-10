#!/usr/bin/env node
// Stages B + C + D + E of the people pipeline.
//
//   B. Aggregate mentions from work/people-raw.json by canonical name; dedupe
//      aliases (e.g. "Bohr" + "Niels Bohr" → one entry); compute mention
//      counts per reading.
//   C. Enrich: fetch Wikipedia summary + birth/death dates for each canonical
//      name; ask Haiku for a short corpus-context note ("why does this person
//      matter in this course's frame").
//   D. Co-occurrence graph: chunk-level pairs.
//   E. Linking aliases: emit a slug-keyed list of all string aliases the
//      markdown post-processor should turn into hyperlinks.
//
// Outputs:
//   static/people.json          { people: [{ slug, name, type, aliases, wikipedia, corpusContext, mentions, mentionCount, readings }, ...] }
//   static/people-graph.json    { nodes: [...], edges: [...] }
//   static/people-aliases.json  { "Foucault": "michel-foucault", ... }   (used by generate-readings.js)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const RAW_PATH = join(ROOT, 'work', 'people-raw.json');
const STATIC = join(ROOT, 'static');

const HAIKU = 'claude-haiku-4-5-20251001';
const CONCURRENCY = 5;
const MIN_MENTIONS_FOR_BIO = 1; // generate bio for everyone, even singletons
const WIKIPEDIA_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

function loadDotenv() {
	const envPath = join(ROOT, '.env');
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
	}
}

function slugify(name) {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

async function runWithConcurrency(items, n, fn) {
	const out = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: n }, async () => {
		while (true) {
			const i = next++;
			if (i >= items.length) return;
			out[i] = await fn(items[i], i);
		}
	});
	await Promise.all(workers);
	return out;
}

async function fetchWikipedia(name) {
	const title = encodeURIComponent(name.replace(/\s+/g, '_'));
	try {
		const res = await fetch(`${WIKIPEDIA_BASE}${title}`, {
			headers: { 'Api-User-Agent': 'pandaemonium-architecture-course/1.0' }
		});
		if (!res.ok) return null;
		const json = await res.json();
		return {
			title: json.title ?? null,
			extract: json.extract ?? null,
			thumbnail: json.thumbnail?.source ?? null,
			url: json.content_urls?.desktop?.page ?? null,
			birthYear: extractYear(json.extract, 'born'),
			deathYear: extractYear(json.extract, 'died')
		};
	} catch {
		return null;
	}
}

// Naive: pull a 4-digit year from common Wikipedia phrasings. Wikidata would
// be more reliable but adds another API. Good enough for rough timeline
// positioning; missing dates just means the person doesn't appear on the
// timeline but still has a page.
function extractYear(extract, kind) {
	if (!extract) return null;
	const m =
		kind === 'born'
			? extract.match(/\b(?:born|b\.)\s+(?:on\s+)?(?:\w+\s+\d+,?\s+)?(\d{4})/i) ||
			  extract.match(/\((\d{4})\s*[-–]\s*\d{4}\)/) ||
			  extract.match(/\((\d{4})\s*[-–]/)
			: extract.match(/\bdied\s+(?:on\s+)?(?:\w+\s+\d+,?\s+)?(\d{4})/i) ||
			  extract.match(/\(\d{4}\s*[-–]\s*(\d{4})\)/);
	return m ? Number(m[1]) : null;
}

const COURSE_CONTEXT_SYSTEM = `You write 2-3 sentence notes about why a given person matters in the context of a graduate course called "Pandaemonium Architecture 6.0" — a seminar on AI, machine learning, cybernetics, and their intersection with art and society.

You'll receive: the person's name, their Wikipedia summary (may be brief or absent), and 2-4 excerpts from where they appear in the course readings.

Write 2-3 sentences ONLY. No headings, no bullets, no quoted prose. Lead with what they're known for in the course's frame, then note how they're being used in the readings (whose argument cites them, what concept they enable). If the Wikipedia summary is empty, infer from the excerpts. If they appear only as a passing reference, say that plainly. Plain prose, no markdown.`;

async function generateContextNote(person, snippets, apiKey) {
	const userMessage = `Person: ${person.name}\n\nWikipedia summary:\n${person.wikipedia?.extract ?? '(not found)'}\n\nExcerpts from course readings where they appear:\n\n${snippets
		.slice(0, 4)
		.map((s, i) => `[${i + 1}] ${s.slice(0, 400)}`)
		.join('\n\n')}`;
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: HAIKU,
			max_tokens: 240,
			system: COURSE_CONTEXT_SYSTEM,
			messages: [{ role: 'user', content: userMessage }]
		})
	});
	if (!res.ok) {
		console.error('context note failed:', res.status);
		return null;
	}
	const json = await res.json();
	return json.content?.[0]?.text?.trim() ?? null;
}

// ---------------------------------------------------------------------------

loadDotenv();
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set.'); process.exit(1); }

if (!existsSync(RAW_PATH)) {
	console.error(`Missing ${RAW_PATH}. Run scripts/people/extract.js first.`);
	process.exit(1);
}

const raw = JSON.parse(readFileSync(RAW_PATH, 'utf-8')).mentions;
console.log(`Loaded ${raw.length} mentions.`);

// --- B: aggregate by canonical name --------------------------------------

const bySlug = new Map();
for (const m of raw) {
	const slug = slugify(m.canonicalName);
	if (!slug) continue;
	let entry = bySlug.get(slug);
	if (!entry) {
		entry = {
			slug,
			name: m.canonicalName,
			type: m.type,
			aliases: new Set(),
			mentions: [],
			typeVotes: new Map()
		};
		bySlug.set(slug, entry);
	}
	entry.aliases.add(m.name);
	entry.aliases.add(m.canonicalName);
	entry.mentions.push({
		readingSlug: m.readingSlug,
		chunkIndex: m.chunkIndex,
		position: m.position,
		snippet: m.snippet,
		matchedAlias: m.name
	});
	entry.typeVotes.set(m.type, (entry.typeVotes.get(m.type) ?? 0) + 1);
}

// Pick the most-voted type per person (first-seen wins on ties).
for (const e of bySlug.values()) {
	let best = e.type;
	let bestN = 0;
	for (const [t, n] of e.typeVotes) {
		if (n > bestN) { best = t; bestN = n; }
	}
	e.type = best;
	delete e.typeVotes;
}

console.log(`${bySlug.size} canonical persons.`);

// --- C: enrich (Wikipedia + corpus-context note) -------------------------

const peopleArr = [...bySlug.values()];
console.log(`Fetching Wikipedia summaries…`);
const t0 = Date.now();
let wpDone = 0;
await runWithConcurrency(peopleArr, 8, async (p) => {
	p.wikipedia = await fetchWikipedia(p.name);
	wpDone++;
	if (wpDone % 50 === 0) process.stderr.write(`  wikipedia: ${wpDone}/${peopleArr.length}\n`);
});
console.log(`Wikipedia: ${peopleArr.filter((p) => p.wikipedia?.extract).length}/${peopleArr.length} found in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);

console.log(`Generating corpus-context notes via Haiku…`);
const t1 = Date.now();
let ctxDone = 0;
await runWithConcurrency(peopleArr, CONCURRENCY, async (p) => {
	if (p.mentions.length < MIN_MENTIONS_FOR_BIO) {
		p.corpusContext = null;
		return;
	}
	const snippets = p.mentions.slice(0, 4).map((m) => m.snippet);
	p.corpusContext = await generateContextNote(p, snippets, apiKey);
	ctxDone++;
	if (ctxDone % 50 === 0) process.stderr.write(`  context: ${ctxDone}/${peopleArr.length}\n`);
});
console.log(`Context notes: ${peopleArr.filter((p) => p.corpusContext).length}/${peopleArr.length} generated in ${((Date.now() - t1) / 1000).toFixed(1)}s.`);

// --- D: co-occurrence graph (chunk-level) --------------------------------

console.log(`Building co-occurrence graph…`);
const chunkPersons = new Map(); // chunkKey → Set<slug>
for (const p of peopleArr) {
	for (const m of p.mentions) {
		const k = `${m.readingSlug}::${m.chunkIndex}`;
		if (!chunkPersons.has(k)) chunkPersons.set(k, new Set());
		chunkPersons.get(k).add(p.slug);
	}
}
const edgeMap = new Map(); // "a||b" → weight
for (const set of chunkPersons.values()) {
	const slugs = [...set].sort();
	for (let i = 0; i < slugs.length; i++) {
		for (let j = i + 1; j < slugs.length; j++) {
			const k = `${slugs[i]}||${slugs[j]}`;
			edgeMap.set(k, (edgeMap.get(k) ?? 0) + 1);
		}
	}
}
const edges = [...edgeMap].map(([k, w]) => {
	const [source, target] = k.split('||');
	return { source, target, weight: w };
});
console.log(`${edges.length} edges (${chunkPersons.size} chunks with ≥1 person).`);

// --- finalize records ----------------------------------------------------

const finalPeople = peopleArr.map((p) => {
	const readings = new Map();
	for (const m of p.mentions) {
		const cur = readings.get(m.readingSlug) ?? 0;
		readings.set(m.readingSlug, cur + 1);
	}
	return {
		slug: p.slug,
		name: p.name,
		type: p.type,
		aliases: [...p.aliases],
		mentions: p.mentions,
		mentionCount: p.mentions.length,
		readings: [...readings.entries()].map(([slug, count]) => ({ slug, count })),
		wikipedia: p.wikipedia
			? {
					extract: p.wikipedia.extract,
					url: p.wikipedia.url,
					thumbnail: p.wikipedia.thumbnail,
					birthYear: p.wikipedia.birthYear,
					deathYear: p.wikipedia.deathYear
				}
			: null,
		corpusContext: p.corpusContext ?? null
	};
});

// Graph nodes: include only people with ≥1 mention (i.e., everyone we have).
// Strength = total degree (sum of edge weights to/from this node).
const degree = new Map();
for (const e of edges) {
	degree.set(e.source, (degree.get(e.source) ?? 0) + e.weight);
	degree.set(e.target, (degree.get(e.target) ?? 0) + e.weight);
}
const nodes = finalPeople.map((p) => ({
	id: p.slug,
	name: p.name,
	type: p.type,
	mentionCount: p.mentionCount,
	degree: degree.get(p.slug) ?? 0,
	birthYear: p.wikipedia?.birthYear ?? null,
	deathYear: p.wikipedia?.deathYear ?? null
}));

// --- E: alias map for markdown linking -----------------------------------

const aliases = {};
for (const p of finalPeople) {
	for (const alias of p.aliases) {
		// Drop aliases that are too short/generic to safely auto-link
		// (single given name like "Lou" would match too much).
		if (alias.length < 4) continue;
		// Prefer the longest alias when two slugs both lay claim — typically
		// "Niels Bohr" wins over a hypothetical other "Bohr".
		const existing = aliases[alias];
		if (!existing || alias.length > (existing.alias?.length ?? 0)) {
			aliases[alias] = { slug: p.slug, alias };
		}
	}
}
const aliasMap = Object.fromEntries(
	Object.entries(aliases).map(([alias, v]) => [alias, v.slug])
);

// Sort canonical so output diffs cleanly.
finalPeople.sort((a, b) => a.name.localeCompare(b.name));
nodes.sort((a, b) => b.degree - a.degree);

writeFileSync(
	join(STATIC, 'people.json'),
	JSON.stringify({ generatedAt: new Date().toISOString(), people: finalPeople }, null, 0)
);
writeFileSync(
	join(STATIC, 'people-graph.json'),
	JSON.stringify({ generatedAt: new Date().toISOString(), nodes, edges }, null, 0)
);
writeFileSync(
	join(STATIC, 'people-aliases.json'),
	JSON.stringify({ generatedAt: new Date().toISOString(), aliases: aliasMap }, null, 0)
);

console.log(
	`Wrote static/people.json (${finalPeople.length} people), static/people-graph.json (${nodes.length} nodes / ${edges.length} edges), static/people-aliases.json (${Object.keys(aliasMap).length} aliases).`
);
