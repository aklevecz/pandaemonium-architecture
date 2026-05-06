import { json, error } from '@sveltejs/kit';
import { retrieve } from '$lib/server/retrieval';
import type { RequestHandler } from './$types';

// Semantic search across all readings. Public (no auth) — same as the
// reader page itself.
//
//   GET /api/search?q=cybernetics&limit=12&slug=optional-restrict
//
// Returns: { hits: [{ slug, chunkIndex, text, position, score }, ...] }
export const GET: RequestHandler = async (event) => {
	const apiKey = event.platform?.env?.GEMINI_API_KEY;
	if (!apiKey) error(500, 'GEMINI_API_KEY not configured');

	const q = event.url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) return json({ hits: [] });

	const limit = Math.min(50, Math.max(1, Number(event.url.searchParams.get('limit') ?? 12)));
	const slug = event.url.searchParams.get('slug') || undefined;

	try {
		const hits = await retrieve(event, q, apiKey, { limit, slug });
		return json({ hits });
	} catch (err) {
		console.error('search error:', err);
		error(502, err instanceof Error ? err.message : 'search failed');
	}
};
