#!/usr/bin/env node
// Stage A of the people pipeline. For every chunk in the embeddings index,
// asks Haiku to identify named persons. Outputs work/people-raw.json — a flat
// list of (readingSlug, chunkIndex, name, canonicalName, type, snippet)
// records, one per mention. Cached per-chunk so re-runs are cheap.
//
// Usage:
//   node scripts/people/extract.js          # process new chunks only
//   node scripts/people/extract.js --force  # re-extract everything

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.cwd();
const META_PATH = join(ROOT, 'static', 'embeddings-meta.json');
const CACHE_DIR = join(ROOT, 'work', 'people-cache');
const OUT_PATH = join(ROOT, 'work', 'people-raw.json');

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const CONCURRENCY = 3;
// Org limit is 50 RPM on Haiku — we stay under via this token-bucket gate.
const RPM_BUDGET = 45;
const MAX_RETRIES = 5;

function loadDotenv() {
	const envPath = join(ROOT, '.env');
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
	}
}

const SYSTEM_PROMPT = `You extract named persons from passages of an academic course reader on AI, machine learning, cybernetics, and their intersection with art and society.

Return a JSON array. For each named person mentioned in the passage (theorists, artists, scientists, writers, historical figures), output:
{
  "name": exact form as it appears in the passage (e.g., "Bohr", "Michel Foucault"),
  "canonicalName": full canonical name (e.g., "Niels Bohr", "Michel Foucault"),
  "type": "philosopher" | "artist" | "scientist" | "writer" | "musician" | "engineer" | "filmmaker" | "psychoanalyst" | "economist" | "mathematician" | "theologian" | "politician" | "historical" | "fictional" | "other"
}

Rules:
- Include passing mentions, but exclude purely metaphorical or generic uses ("a Foucauldian reading" — yes; "doing a Houdini" used metaphorically — no).
- For people known by one name (Plato, Hegel), canonicalName = the one name.
- Skip authors when they're cited only as "(Smith 1992)"-style bibliographic refs.
- Skip institutions, places, books, and concepts.
- If no named persons appear, return [].
- Output ONLY the JSON array. No prose, no markdown fences.`;

// Token-bucket rate limiter. acquire() resolves when a slot is free given a
// rolling 60s window of recent requests. Way simpler than a full leaky-bucket
// and works fine here because we control the only client.
const rateBuf = [];
async function acquireRPMSlot() {
	while (true) {
		const now = Date.now();
		while (rateBuf.length && rateBuf[0] < now - 60_000) rateBuf.shift();
		if (rateBuf.length < RPM_BUDGET) {
			rateBuf.push(now);
			return;
		}
		const waitMs = Math.max(0, rateBuf[0] + 60_000 - now) + 50;
		await new Promise((r) => setTimeout(r, waitMs));
	}
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function extractFromChunk(text, apiKey) {
	const body = {
		model: MODEL,
		max_tokens: MAX_TOKENS,
		system: SYSTEM_PROMPT,
		messages: [{ role: 'user', content: text.slice(0, 8000) }]
	};
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		await acquireRPMSlot();
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify(body)
		});
		if (res.ok) {
			const json = await res.json();
			const raw = json.content?.[0]?.text?.trim() ?? '[]';
			const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
			try {
				return JSON.parse(cleaned);
			} catch {
				console.error('Failed to parse Haiku output:', cleaned.slice(0, 200));
				return [];
			}
		}
		const errBody = await res.text().catch(() => '');
		// Honor retry-after on 429 / 529 (overloaded).
		if (res.status === 429 || res.status === 529 || res.status === 503) {
			const ra = Number(res.headers.get('retry-after'));
			const backoff = (Number.isFinite(ra) ? ra * 1000 : 0) || Math.min(30_000, 2 ** attempt * 1000);
			console.error(`  rate-limited (${res.status}), backing off ${backoff}ms`);
			await sleep(backoff);
			continue;
		}
		throw new Error(`Haiku ${res.status}: ${errBody.slice(0, 300)}`);
	}
	throw new Error('Haiku: exhausted retries');
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

function chunkCachePath(slug, chunkIndex) {
	return join(CACHE_DIR, slug, `${chunkIndex}.json`);
}

loadDotenv();
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set.'); process.exit(1); }

if (!existsSync(META_PATH)) {
	console.error(`Missing ${META_PATH}. Run scripts/embed-readings.js first.`);
	process.exit(1);
}
const force = process.argv.includes('--force');

const meta = JSON.parse(readFileSync(META_PATH, 'utf-8'));
const chunks = meta.chunks;
console.log(`Processing ${chunks.length} chunks…`);

mkdirSync(CACHE_DIR, { recursive: true });

let cacheHits = 0;
let fresh = 0;
const t0 = Date.now();
let done = 0;

const results = await runWithConcurrency(chunks, CONCURRENCY, async (c) => {
	const cachePath = chunkCachePath(c.slug, c.chunkIndex);
	if (!force && existsSync(cachePath)) {
		cacheHits++;
		done++;
		return JSON.parse(readFileSync(cachePath, 'utf-8'));
	}
	const people = await extractFromChunk(c.text, apiKey);
	mkdirSync(dirname(cachePath), { recursive: true });
	writeFileSync(cachePath, JSON.stringify(people));
	fresh++;
	done++;
	if (done % 100 === 0) process.stderr.write(`  ${done}/${chunks.length}  (cache=${cacheHits} fresh=${fresh})\n`);
	return people;
});

// Flatten into per-mention rows.
const mentions = [];
for (let i = 0; i < chunks.length; i++) {
	const c = chunks[i];
	for (const p of results[i] ?? []) {
		if (!p || !p.canonicalName || typeof p.canonicalName !== 'string') continue;
		mentions.push({
			readingSlug: c.slug,
			chunkIndex: c.chunkIndex,
			name: String(p.name ?? p.canonicalName).trim(),
			canonicalName: String(p.canonicalName).trim(),
			type: String(p.type ?? 'other').trim().toLowerCase(),
			position: c.position,
			snippet: c.text.slice(0, 280)
		});
	}
}

writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), mentions }, null, 0));
console.log(
	`Wrote ${mentions.length} mentions across ${new Set(mentions.map((m) => m.canonicalName)).size} unique canonical names to ${OUT_PATH} in ${((Date.now() - t0) / 1000).toFixed(1)}s (cache hits: ${cacheHits}, fresh: ${fresh})`
);
