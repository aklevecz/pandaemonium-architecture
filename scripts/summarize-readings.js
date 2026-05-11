#!/usr/bin/env node
// Builds a structured summary for every reading in static/reading-content/.
// Sonnet 4.6 over the full reading text → JSON with { tldr, thesis,
// keyTerms, outline, representativePassages }. Related readings are
// computed locally from the existing embeddings index (cheaper and more
// accurate than asking the model to guess).
//
// Outputs:
//   static/summaries/<slug>.json
//   static/summaries-index.json   (slug → tldr, for the readings index)
//
// Per-reading cache so re-runs are cheap. Costs ~$0.06/reading at Sonnet
// pricing — total ~$4 for the corpus on first run, near-zero on re-runs.
//
// Usage:
//   node scripts/summarize-readings.js          # process new only
//   node scripts/summarize-readings.js --force  # re-summarize everything

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const READING_DIR = join(ROOT, 'static', 'reading-content');
const EMBED_BIN = join(ROOT, 'static', 'embeddings.bin');
const EMBED_META = join(ROOT, 'static', 'embeddings-meta.json');
const OUT_DIR = join(ROOT, 'static', 'summaries');
const INDEX_PATH = join(ROOT, 'static', 'summaries-index.json');

const MODEL = 'claude-sonnet-4-5'; // grad-seminar quality matters
const MAX_TOKENS = 2500;
const SONNET_RPM_BUDGET = 40;
const CONCURRENCY = 3;
const MAX_RETRIES = 5;
const RELATED_K = 3;

function loadDotenv() {
	const envPath = join(ROOT, '.env');
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
	}
}

// --- Rate limiter + retry -------------------------------------------------

const rateBuf = [];
async function acquireSlot() {
	while (true) {
		const now = Date.now();
		while (rateBuf.length && rateBuf[0] < now - 60_000) rateBuf.shift();
		if (rateBuf.length < SONNET_RPM_BUDGET) {
			rateBuf.push(now);
			return;
		}
		await new Promise((r) => setTimeout(r, Math.max(0, rateBuf[0] + 60_000 - now) + 50));
	}
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// --- Summarization --------------------------------------------------------

const SYSTEM_PROMPT = `You produce structured summaries of academic readings for a graduate seminar called "Pandaemonium Architecture 6.0" — AI, machine learning, cybernetics, and their intersection with art and society.

Return a single JSON object with this shape:

{
  "tldr": "One-paragraph TL;DR, 1-2 sentences, ~30-50 words. Plain prose. The reader is choosing what to read next; this is the elevator pitch.",
  "thesis": "What the author actually argues, 2-4 sentences. Specific, not generic. Use the author's own framing where it sharpens the point.",
  "keyTerms": [
    { "term": "...", "gloss": "1-2 sentences explaining the term as the author uses it (not the dictionary entry)." }
  ],
  "outline": ["Section/move 1", "Section/move 2", ...],
  "representativePassages": [
    { "text": "verbatim quote from the reading, 1-3 sentences", "why": "what this passage crystallizes" }
  ]
}

Rules:
- 4–6 keyTerms. Pick terms the author either coins, repurposes, or makes load-bearing — not generic vocabulary.
- 3–6 outline steps. Capture the argumentative shape, not the literal section headings.
- 2–3 representativePassages. Quote verbatim from the text (within the bounds of what's provided). Don't invent quotes.
- Pitch the prose at graduate-seminar level — assume the reader is willing to work through theoretical material.
- Output ONLY the JSON object. No prose, no markdown fences, no preamble.`;

async function summarize(slug, content, apiKey) {
	const body = JSON.stringify({
		model: MODEL,
		max_tokens: MAX_TOKENS,
		system: [
			{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }
		],
		messages: [
			{
				role: 'user',
				content: `Reading slug: ${slug}\n\n---\n\n${content.slice(0, 60_000)}`
			}
		]
	});
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		await acquireSlot();
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
				'anthropic-beta': 'prompt-caching-2024-07-31'
			},
			body
		});
		if (res.ok) {
			const json = await res.json();
			const raw = json.content?.[0]?.text?.trim() ?? '{}';
			const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
			try {
				return JSON.parse(cleaned);
			} catch (err) {
				console.error(`  ${slug}: bad JSON, returning empty`, err.message);
				return null;
			}
		}
		if (res.status === 429 || res.status === 529 || res.status === 503) {
			const ra = Number(res.headers.get('retry-after'));
			const backoff =
				(Number.isFinite(ra) ? ra * 1000 : 0) || Math.min(30_000, 2 ** attempt * 1000);
			console.error(`  ${slug}: rate-limited (${res.status}), waiting ${backoff}ms`);
			await sleep(backoff);
			continue;
		}
		const err = await res.text().catch(() => '');
		throw new Error(`Sonnet ${res.status}: ${err.slice(0, 300)}`);
	}
	throw new Error('exhausted retries');
}

// --- Related readings from embeddings -------------------------------------

function computeRelated() {
	if (!existsSync(EMBED_BIN) || !existsSync(EMBED_META)) {
		console.warn('Embeddings not built; skipping relatedReadings.');
		return new Map();
	}
	const meta = JSON.parse(readFileSync(EMBED_META, 'utf-8'));
	const dims = meta.dims;
	const bin = readFileSync(EMBED_BIN);
	const vec = new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4);

	// Centroid per reading.
	const slugChunks = new Map();
	for (let i = 0; i < meta.chunks.length; i++) {
		const slug = meta.chunks[i].slug;
		const arr = slugChunks.get(slug) ?? [];
		arr.push(i);
		slugChunks.set(slug, arr);
	}
	const centroids = new Map();
	for (const [slug, indices] of slugChunks) {
		const sum = new Float32Array(dims);
		for (const i of indices) {
			const base = i * dims;
			for (let j = 0; j < dims; j++) sum[j] += vec[base + j];
		}
		for (let j = 0; j < dims; j++) sum[j] /= indices.length;
		// Normalize for cosine-as-dot-product.
		let n = 0;
		for (let j = 0; j < dims; j++) n += sum[j] * sum[j];
		n = Math.sqrt(n) || 1;
		for (let j = 0; j < dims; j++) sum[j] /= n;
		centroids.set(slug, sum);
	}

	const related = new Map();
	const slugs = [...centroids.keys()];
	for (const s of slugs) {
		const me = centroids.get(s);
		const scores = [];
		for (const t of slugs) {
			if (t === s) continue;
			const other = centroids.get(t);
			let dot = 0;
			for (let j = 0; j < dims; j++) dot += me[j] * other[j];
			scores.push({ slug: t, score: dot });
		}
		scores.sort((a, b) => b.score - a.score);
		related.set(s, scores.slice(0, RELATED_K));
	}
	return related;
}

// --- Main -----------------------------------------------------------------

loadDotenv();
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set.'); process.exit(1); }

if (!existsSync(READING_DIR)) {
	console.error(`No ${READING_DIR}. Run scripts/generate-readings.js first.`);
	process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
const force = process.argv.includes('--force');

const files = readdirSync(READING_DIR).filter((f) => f.endsWith('.md')).sort();
console.log(`Summarizing ${files.length} readings…`);

const related = computeRelated();

const t0 = Date.now();
let done = 0;
let fresh = 0;
let cached = 0;
const results = await runWithConcurrency(files, CONCURRENCY, async (file) => {
	const slug = file.replace(/\.md$/, '');
	const outPath = join(OUT_DIR, `${slug}.json`);
	let summary = null;
	if (!force && existsSync(outPath)) {
		summary = JSON.parse(readFileSync(outPath, 'utf-8'));
		cached++;
	} else {
		const content = readFileSync(join(READING_DIR, file), 'utf-8');
		try {
			summary = await summarize(slug, content, apiKey);
		} catch (err) {
			console.error(`  ${slug}: failed — ${err.message}`);
			summary = null;
		}
		fresh++;
	}
	if (summary) {
		summary.slug = slug;
		summary.relatedReadings = (related.get(slug) ?? []).map((r) => ({ slug: r.slug, score: r.score }));
		writeFileSync(outPath, JSON.stringify(summary, null, 2));
	}
	done++;
	if (done % 5 === 0) process.stderr.write(`  ${done}/${files.length}\n`);
	return summary;
});

// Index: { slug -> tldr } for the readings index page (avoids loading every
// per-slug file just to render the listing).
const index = {};
for (let i = 0; i < files.length; i++) {
	const slug = files[i].replace(/\.md$/, '');
	const s = results[i];
	if (s && s.tldr) index[slug] = s.tldr;
}
writeFileSync(INDEX_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), tldrs: index }, null, 0));

console.log(
	`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s. Fresh: ${fresh}, cached: ${cached}. Wrote ${Object.keys(index).length}/${files.length} summaries.`
);
