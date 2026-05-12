import { error } from '@sveltejs/kit';
import { dataUrl } from '$lib/server/data-url';
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

export const load: PageServerLoad = async ({ fetch, url }) => {
	const res = await fetch(dataUrl('/people-graph.json', url.origin));
	if (!res.ok) error(503, 'Graph not built yet — run `node scripts/people/build.js`');
	const json = (await res.json()) as { nodes: GraphNode[]; edges: GraphEdge[] };
	return { nodes: json.nodes, edges: json.edges };
};
