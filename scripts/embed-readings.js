#!/usr/bin/env node
// Build-time step: chunks each static/reading-content/<slug>.md into
// paragraph-grouped chunks, embeds them via Gemini text-embedding-004, and
// writes two files served as static assets:
//
//   static/embeddings.bin       — raw concatenated Float32Array (chunkCount * 768 * 4 bytes)
//   static/embeddings-meta.json — [{ slug, chunkIndex, text, position }, ...] in matching order
//
// The runtime (/api/search, /api/chat RAG) fetches both, caches in module
// scope, then does cosine similarity in JS. ~2200 chunks * 768 dims * 4 bytes
// = ~6.5 MB, well within Worker memory.
//
// Re-run after corpus changes:
//   node scripts/embed-readings.js
//
// Requires GEMINI_API_KEY in .env.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const READING_CONTENT_DIR = join(ROOT, 'static', 'reading-content');
const STATIC_DIR = join(ROOT, 'static');

const EMBED_MODEL = 'text-embedding-004';
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;
const EMBED_DIMS = 768;
const TARGET_CHUNK_TOKENS = 500;
// rough char-to-token ratio for English (4-5 chars/token).
const TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * 4;
const CONCURRENCY = 8;

function loadDotenv() {
	const envPath = join(ROOT, '.env');
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
	}
}

// Strip markdown formatting + image refs so embeddings are over clean prose.
function stripMarkdown(md) {
	return md
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links
		.replace(/^#{1,6}\s+/gm, '') // heading markers (keep heading text)
		.replace(/[*_`~]+/g, '') // emphasis
		.replace(/^\s*>\s?/gm, ''); // blockquote markers
}

// Group paragraphs greedily until each chunk is roughly TARGET_CHUNK_CHARS.
// Paragraphs split on blank-line boundaries (markdown convention).
function chunkText(stripped) {
	const paragraphs = stripped.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
	const chunks = [];
	let buf = '';
	for (const p of paragraphs) {
		if (buf.length + p.length + 2 > TARGET_CHUNK_CHARS && buf.length > 0) {
			chunks.push(buf.trim());
			buf = '';
		}
		buf = buf ? `${buf}\n\n${p}` : p;
	}
	if (buf.trim()) chunks.push(buf.trim());
	return chunks;
}

async function embedOne(text, apiKey) {
	const body = {
		model: `models/${EMBED_MODEL}`,
		content: { parts: [{ text }] },
		taskType: 'RETRIEVAL_DOCUMENT'
	};
	const res = await fetch(EMBED_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		throw new Error(`Gemini embed ${res.status}: ${errText.slice(0, 300)}`);
	}
	const json = await res.json();
	const values = json.embedding?.values;
	if (!values || values.length !== EMBED_DIMS) {
		throw new Error(`Gemini embed returned ${values?.length ?? 0} dims, expected ${EMBED_DIMS}`);
	}
	return values;
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

loadDotenv();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
	console.error('GEMINI_API_KEY not set (checked .env).');
	process.exit(1);
}

if (!existsSync(READING_CONTENT_DIR)) {
	console.error(`No ${READING_CONTENT_DIR} — run \`node scripts/generate-readings.js\` first.`);
	process.exit(1);
}

const files = readdirSync(READING_CONTENT_DIR).filter((f) => f.endsWith('.md')).sort();
console.log(`Chunking ${files.length} readings…`);

const chunks = [];
for (const file of files) {
	const slug = file.replace(/\.md$/, '');
	const raw = readFileSync(join(READING_CONTENT_DIR, file), 'utf-8');
	const stripped = stripMarkdown(raw);
	const split = chunkText(stripped);
	for (let i = 0; i < split.length; i++) {
		chunks.push({
			slug,
			chunkIndex: i,
			text: split[i],
			position: split.length === 1 ? 0 : i / (split.length - 1)
		});
	}
}
const totalChars = chunks.reduce((a, c) => a + c.text.length, 0);
console.log(`  ${chunks.length} chunks, avg ${Math.round(totalChars / chunks.length)} chars`);
console.log(`Embedding (concurrency=${CONCURRENCY})…`);

const t0 = Date.now();
let done = 0;
const vectors = await runWithConcurrency(chunks, CONCURRENCY, async (c) => {
	const v = await embedOne(c.text, apiKey);
	done++;
	if (done % 100 === 0) process.stderr.write(`  ${done}/${chunks.length}\n`);
	return v;
});
console.log(`Embedded ${chunks.length} chunks in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Pack into a single Float32Array for compact storage.
const packed = new Float32Array(chunks.length * EMBED_DIMS);
for (let i = 0; i < vectors.length; i++) {
	packed.set(vectors[i], i * EMBED_DIMS);
}

mkdirSync(STATIC_DIR, { recursive: true });
writeFileSync(join(STATIC_DIR, 'embeddings.bin'), Buffer.from(packed.buffer));
writeFileSync(
	join(STATIC_DIR, 'embeddings-meta.json'),
	JSON.stringify(
		{
			model: EMBED_MODEL,
			dims: EMBED_DIMS,
			count: chunks.length,
			generatedAt: new Date().toISOString(),
			chunks: chunks.map((c) => ({
				slug: c.slug,
				chunkIndex: c.chunkIndex,
				text: c.text,
				position: c.position
			}))
		},
		null,
		0
	)
);

const binSize = packed.byteLength;
const metaSize = JSON.stringify({ chunks }).length;
console.log(
	`Wrote static/embeddings.bin (${(binSize / 1024 / 1024).toFixed(2)} MB) + static/embeddings-meta.json (${(metaSize / 1024 / 1024).toFixed(2)} MB)`
);
