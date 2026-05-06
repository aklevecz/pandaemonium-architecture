// Gemini text-embedding-004 wrapper. Used both at build time
// (scripts/embed-readings.js) and at request time (/api/search,
// /api/chat for RAG).
//
// Free tier: 1500 RPM, 768-dim float32 vectors, $0.

// gemini-embedding-2: 3072 dims native, 8192 input token limit. We truncate
// to 768 via outputDimensionality (Matryoshka) to keep on-disk footprint
// modest (~9 MB for ~3000 chunks vs ~36 MB at full size). Quality at 768 is
// essentially indistinguishable from 3072 for retrieval at corpus scale.
const EMBED_MODEL = 'gemini-embedding-2';
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;

export const EMBEDDING_DIMS = 768;
export const EMBEDDING_MODEL = EMBED_MODEL;

export interface EmbedOptions {
	apiKey: string;
	// "RETRIEVAL_DOCUMENT" for stored chunks; "RETRIEVAL_QUERY" for queries.
	// Gemini tunes the vector slightly differently for asymmetric retrieval.
	taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY';
	title?: string;
}

export async function embed(text: string, opts: EmbedOptions): Promise<Float32Array> {
	const body: Record<string, unknown> = {
		model: `models/${EMBED_MODEL}`,
		content: { parts: [{ text }] },
		outputDimensionality: EMBEDDING_DIMS
	};
	if (opts.taskType) body.taskType = opts.taskType;
	if (opts.title) body.title = opts.title;

	const res = await fetch(EMBED_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		throw new Error(`Gemini embed ${res.status}: ${errText.slice(0, 300)}`);
	}
	const json = (await res.json()) as { embedding?: { values?: number[] } };
	const values = json.embedding?.values;
	if (!values || values.length !== EMBEDDING_DIMS) {
		throw new Error(`Gemini embed: expected ${EMBEDDING_DIMS} dims, got ${values?.length ?? 0}`);
	}
	return new Float32Array(values);
}

export function vectorToBlob(v: Float32Array): Uint8Array {
	return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
}

export function blobToVector(blob: ArrayBuffer | Uint8Array): Float32Array {
	const buf = blob instanceof Uint8Array ? blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength) : blob;
	return new Float32Array(buf);
}

export function cosine(a: Float32Array, b: Float32Array): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	const d = Math.sqrt(na) * Math.sqrt(nb);
	return d === 0 ? 0 : dot / d;
}
