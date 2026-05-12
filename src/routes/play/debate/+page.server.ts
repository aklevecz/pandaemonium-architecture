import { error, redirect } from '@sveltejs/kit';
import { dataUrl } from '$lib/server/data-url';
import type { PageServerLoad } from './$types';

interface PersonLite {
	slug: string;
	name: string;
	type: string;
	mentionCount: number;
	hasContext: boolean;
	hasWikipedia: boolean;
	birthYear: number | null;
	deathYear: number | null;
}

// We list ~600 thinkers — too many for the picker to load the full people.json
// (4.6MB). Build a slim list here keyed on what we actually need to render
// thinker cards.
export const load: PageServerLoad = async ({ fetch, url, locals }) => {
	if (!locals.user) redirect(303, '/login');
	const res = await fetch(dataUrl('/people.json', url.origin));
	if (!res.ok) error(503, 'People index not built yet');
	const json = (await res.json()) as {
		people: Array<{
			slug: string;
			name: string;
			type: string;
			mentionCount: number;
			corpusContext: string | null;
			wikipedia: { extract: string | null; birthYear: number | null; deathYear: number | null } | null;
		}>;
	};
	// Filter to the "interesting" subset — anyone with a curated context note
	// or a Wikipedia hit, or who's mentioned at least twice in the corpus.
	// Drops noise (one-off names the extractor caught) while keeping the
	// real long tail of cited theorists/artists/scientists.
	const slim: PersonLite[] = json.people
		.filter(
			(p) => p.corpusContext || p.wikipedia?.extract || p.mentionCount >= 2
		)
		.map((p) => ({
			slug: p.slug,
			name: p.name,
			type: p.type,
			mentionCount: p.mentionCount,
			hasContext: !!p.corpusContext,
			hasWikipedia: !!p.wikipedia?.extract,
			birthYear: p.wikipedia?.birthYear ?? null,
			deathYear: p.wikipedia?.deathYear ?? null
		}))
		.sort((a, b) => b.mentionCount - a.mentionCount);
	return { thinkers: slim };
};
