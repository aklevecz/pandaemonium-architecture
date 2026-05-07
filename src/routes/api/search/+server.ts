import { json, error } from '@sveltejs/kit';
import { retrieve, type RetrievalHit } from '$lib/server/retrieval';
import type { RequestHandler } from './$types';

// Semantic search across all readings. Public (no auth) — same as the reader
// page itself.
//
//   GET /api/search?q=…&limit=8&perReading=3&slug=optional-restrict
//
// Returns: { groups: [{ slug, score, chunks: [{ chunkIndex, text, position, score }, ...] }, ...] }
//
// Internally we retrieve a wider top-K (default 40) and group by slug so a
// reading whose best passage ranks #1 doesn't crowd out other readings whose
// best passage ranks #5. Each group's score is its best chunk's score.
//
// When `slug` is set (in-reading search) we skip grouping — caller wants
// chunk-level results within the one reading.
export const GET: RequestHandler = async (event) => {
	const apiKey = event.platform?.env?.GEMINI_API_KEY;
	if (!apiKey) error(500, 'GEMINI_API_KEY not configured');

	const q = event.url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) return json({ groups: [] });

	const limit = Math.min(20, Math.max(1, Number(event.url.searchParams.get('limit') ?? 8)));
	const perReading = Math.min(
		8,
		Math.max(1, Number(event.url.searchParams.get('perReading') ?? 3))
	);
	const slug = event.url.searchParams.get('slug') || undefined;

	try {
		// Retrieve enough raw hits that, after grouping, we still have `limit`
		// distinct readings. 6× headroom is safe even when the best K
		// passages all come from the same long reading.
		const innerLimit = slug ? limit : Math.min(80, limit * perReading * 2);
		const hits = await retrieve(event, q, apiKey, { limit: innerLimit, slug });

		if (slug) {
			// Single-reading mode: caller wanted chunk-level results.
			return json({
				groups: [
					{
						slug,
						score: hits[0]?.score ?? 0,
						chunks: hits.slice(0, limit).map(stripSlug)
					}
				]
			});
		}

		const grouped = new Map<string, { slug: string; score: number; chunks: ReturnType<typeof stripSlug>[] }>();
		for (const h of hits) {
			const g = grouped.get(h.slug);
			if (g) {
				if (g.chunks.length < perReading) g.chunks.push(stripSlug(h));
			} else {
				grouped.set(h.slug, {
					slug: h.slug,
					score: h.score,
					chunks: [stripSlug(h)]
				});
			}
		}
		const groups = [...grouped.values()].sort((a, b) => b.score - a.score).slice(0, limit);
		return json({ groups });
	} catch (err) {
		console.error('search error:', err);
		error(502, err instanceof Error ? err.message : 'search failed');
	}
};

function stripSlug(h: RetrievalHit) {
	return {
		chunkIndex: h.chunkIndex,
		text: h.text,
		position: h.position,
		score: h.score
	};
}
