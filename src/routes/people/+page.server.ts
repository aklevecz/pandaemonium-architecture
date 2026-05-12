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
	return { people: json.people };
};
