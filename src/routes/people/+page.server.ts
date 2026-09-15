import { error } from '@sveltejs/kit';
import { dataUrl } from '$lib/server/data-url';
import type { PageServerLoad } from './$types';

interface Person {
	slug: string;
	name: string;
	type: string;
	mentionCount: number;
	readings: { slug: string; count: number }[];
	wikipedia: { extract: string | null; thumbnail: string | null; birthYear: number | null; deathYear: number | null } | null;
	corpusContext: string | null;
}

export const load: PageServerLoad = async ({ fetch, url }) => {
	const res = await fetch(dataUrl('/people.json', url.origin));
	if (!res.ok) error(503, 'People index not built yet — run `node scripts/people/build.js` then `bash scripts/upload-data.sh`');
	const json = (await res.json()) as { people: Person[] };
	// people.json is about 5MB because every mention carries a snippet. The
	// index only needs a few fields per person, so send those and nothing else.
	return {
		people: json.people.map((p) => ({
			slug: p.slug,
			name: p.name,
			type: p.type,
			mentionCount: p.mentionCount,
			readingCount: p.readings.length,
			birthYear: p.wikipedia?.birthYear ?? null,
			deathYear: p.wikipedia?.deathYear ?? null
		}))
	};
};
