import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
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

export const load: PageServerLoad = async ({ fetch, platform, url }) => {
	const path = '/people.json';
	const res =
		!dev && platform?.env?.ASSETS
			? await platform.env.ASSETS.fetch(new URL(path, url.origin).toString())
			: await fetch(path);
	if (!res.ok) error(503, 'People index not built yet — run `node scripts/people/build.js`');
	const json = (await res.json()) as { people: Person[] };
	return { people: json.people };
};
