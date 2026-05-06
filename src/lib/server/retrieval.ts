// Loads the embeddings.bin + embeddings-meta.json static assets once per
// Worker isolate and exposes a top-K cosine search. Used by /api/search and
// by the chat RAG step in /api/chat.

import { embed, blobToVector, cosine, EMBEDDING_DIMS } from './embed';
import type { RequestEvent } from '@sveltejs/kit';

interface ChunkMeta {
	slug: string;
	chunkIndex: number;
	text: string;
	position: number;
}

interface IndexState {
	loadedAt: number;
	count: number;
	dims: number;
	vectors: Float32Array; // packed: count * dims
	meta: ChunkMeta[];
}

let cached: IndexState | null = null;
let pending: Promise<IndexState> | null = null;

async function loadIndex(event: Pick<RequestEvent, 'fetch'>): Promise<IndexState> {
	if (cached) return cached;
	if (pending) return pending;
	pending = (async () => {
		const [binRes, metaRes] = await Promise.all([
			event.fetch('/embeddings.bin'),
			event.fetch('/embeddings-meta.json')
		]);
		if (!binRes.ok || !metaRes.ok) {
			throw new Error(
				`Failed to load embeddings (bin=${binRes.status}, meta=${metaRes.status}). Run \`node scripts/embed-readings.js\` to generate them.`
			);
		}
		const buf = await binRes.arrayBuffer();
		const metaJson = (await metaRes.json()) as {
			dims: number;
			count: number;
			chunks: ChunkMeta[];
		};
		if (metaJson.dims !== EMBEDDING_DIMS) {
			throw new Error(`embeddings-meta.json dims=${metaJson.dims} doesn't match runtime ${EMBEDDING_DIMS}`);
		}
		cached = {
			loadedAt: Date.now(),
			count: metaJson.count,
			dims: metaJson.dims,
			vectors: blobToVector(buf),
			meta: metaJson.chunks
		};
		return cached;
	})();
	try {
		return await pending;
	} finally {
		pending = null;
	}
}

export interface RetrievalHit {
	slug: string;
	chunkIndex: number;
	text: string;
	position: number;
	score: number;
}

export interface RetrievalOptions {
	limit?: number;
	// Restrict matches to a single reading. Useful for chat RAG when we want
	// in-context citations rather than cross-corpus references.
	slug?: string;
	// Optional pre-computed query vector — saves an embed call when the caller
	// has already embedded for another purpose.
	queryVector?: Float32Array;
}

export async function retrieve(
	event: Pick<RequestEvent, 'fetch' | 'platform'>,
	query: string,
	apiKey: string,
	opts: RetrievalOptions = {}
): Promise<RetrievalHit[]> {
	const limit = opts.limit ?? 8;
	const idx = await loadIndex(event);

	const queryVec =
		opts.queryVector ?? (await embed(query, { apiKey, taskType: 'RETRIEVAL_QUERY' }));

	// Single-pass cosine over the packed Float32Array. ~50ms on 2200x768.
	const dims = idx.dims;
	const scores = new Float32Array(idx.count);
	let qNorm = 0;
	for (let j = 0; j < dims; j++) qNorm += queryVec[j] * queryVec[j];
	qNorm = Math.sqrt(qNorm) || 1;

	for (let i = 0; i < idx.count; i++) {
		if (opts.slug && idx.meta[i].slug !== opts.slug) {
			scores[i] = -Infinity;
			continue;
		}
		let dot = 0;
		let cNorm = 0;
		const base = i * dims;
		for (let j = 0; j < dims; j++) {
			const v = idx.vectors[base + j];
			dot += queryVec[j] * v;
			cNorm += v * v;
		}
		const denom = qNorm * (Math.sqrt(cNorm) || 1);
		scores[i] = denom === 0 ? 0 : dot / denom;
	}

	// Pick top-K via partial sort (linear scan + heap-of-K is overkill at this scale).
	const indices = Array.from({ length: idx.count }, (_, i) => i);
	indices.sort((a, b) => scores[b] - scores[a]);
	return indices.slice(0, limit).map((i) => ({
		slug: idx.meta[i].slug,
		chunkIndex: idx.meta[i].chunkIndex,
		text: idx.meta[i].text,
		position: idx.meta[i].position,
		score: scores[i]
	}));
}
