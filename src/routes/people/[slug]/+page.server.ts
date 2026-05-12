import { error } from '@sveltejs/kit';
import { weeks, introductoryReadings, type Reading } from '$lib/data/syllabus';
import { slugify } from '$lib/utils/slug';
import { dataUrl } from '$lib/server/data-url';
import type { PageServerLoad } from './$types';

interface Mention {
	readingSlug: string;
	chunkIndex: number;
	position: number;
	snippet: string;
	matchedAlias: string;
}
interface Person {
	slug: string;
	name: string;
	type: string;
	aliases: string[];
	mentions: Mention[];
	mentionCount: number;
	readings: { slug: string; count: number }[];
	wikipedia: { extract: string | null; url: string | null; thumbnail: string | null; birthYear: number | null; deathYear: number | null } | null;
	corpusContext: string | null;
}
interface GraphNode {
	id: string;
	name: string;
	type: string;
	mentionCount: number;
	degree: number;
	birthYear: number | null;
	deathYear: number | null;
}
interface GraphEdge {
	source: string;
	target: string;
	weight: number;
}

function buildReadingMeta() {
	const m = new Map<string, { title: string; author: string }>();
	for (const r of introductoryReadings) m.set(slugify(r.pdf), { title: r.title, author: r.author });
	for (const w of weeks) {
		for (const r of w.readings) m.set(slugify(r.pdf), { title: r.title, author: r.author });
		for (const r of w.additionalReadings) m.set(slugify(r.pdf), { title: r.title, author: r.author });
	}
	return m;
}
const readingMeta = buildReadingMeta();

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const [peopleRes, graphRes, fallbackRes] = await Promise.all([
		fetch(dataUrl('/people.json', url.origin)),
		fetch(dataUrl('/people-graph.json', url.origin)),
		fetch(dataUrl('/readings-fallback.json', url.origin))
	]);
	if (!peopleRes.ok)
		error(503, 'People index not built yet — run `node scripts/people/build.js`');
	const peopleJson = (await peopleRes.json()) as { people: Person[] };
	const person = peopleJson.people.find((p) => p.slug === params.slug);
	if (!person) error(404, 'Person not found');

	const graphJson = graphRes.ok
		? ((await graphRes.json()) as { nodes: GraphNode[]; edges: GraphEdge[] })
		: { nodes: [], edges: [] };
	const fallbackJson = fallbackRes.ok
		? ((await fallbackRes.json()) as Record<string, { author: string; title: string }>)
		: {};

	const reading = (slug: string) =>
		readingMeta.get(slug) ?? fallbackJson[slug] ?? { title: slug, author: '' };

	// Collect neighbors (people who appear in the same chunks).
	const nodesById = new Map(graphJson.nodes.map((n) => [n.id, n]));
	const neighbors: { person: GraphNode; weight: number }[] = [];
	for (const e of graphJson.edges) {
		if (e.source === params.slug || e.target === params.slug) {
			const otherId = e.source === params.slug ? e.target : e.source;
			const other = nodesById.get(otherId);
			if (other) neighbors.push({ person: other, weight: e.weight });
		}
	}
	neighbors.sort((a, b) => b.weight - a.weight);

	// Group mentions by reading + slim down to readable shape.
	const byReading = new Map<string, Mention[]>();
	for (const m of person.mentions) {
		const arr = byReading.get(m.readingSlug) ?? [];
		arr.push(m);
		byReading.set(m.readingSlug, arr);
	}
	const readingMentions = [...byReading.entries()]
		.map(([slug, ms]) => ({
			slug,
			meta: reading(slug),
			mentions: ms.sort((a, b) => a.position - b.position)
		}))
		.sort((a, b) => b.mentions.length - a.mentions.length);

	return { person, neighbors: neighbors.slice(0, 30), readingMentions };
};
