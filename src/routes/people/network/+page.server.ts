import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';

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

export const load: PageServerLoad = async ({ fetch, platform, url }) => {
	const path = '/people-graph.json';
	const res =
		!dev && platform?.env?.ASSETS
			? await platform.env.ASSETS.fetch(new URL(path, url.origin).toString())
			: await fetch(path);
	if (!res.ok) error(503, 'Graph not built yet — run `node scripts/people/build.js`');
	const json = (await res.json()) as { nodes: GraphNode[]; edges: GraphEdge[] };
	return { nodes: json.nodes, edges: json.edges };
};
