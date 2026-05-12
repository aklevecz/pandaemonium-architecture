import { dev } from '$app/environment';

// Large generated data files (embeddings, people index + graph, summaries)
// used to live in static/ but Cloudflare's Workers Static Assets service
// kept evicting them between deploys, breaking /people, /search, /play,
// and the reader's RAG calls. They're now uploaded to R2 (pandaemonium-pdfs
// bucket, /data prefix) where they're not subject to that eviction.
//
// In dev we still want Vite to serve from local static/ so a developer
// can edit + reload without re-uploading to R2. This helper picks the
// right URL.
const R2_BASE = 'https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/data';

export function dataUrl(path: string, requestOrigin: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (dev) return new URL(clean, requestOrigin).toString();
	return `${R2_BASE}${clean}`;
}
