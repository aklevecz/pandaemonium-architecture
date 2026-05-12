import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { weeks, introductoryReadings, type Reading } from '$lib/data/syllabus';
import { slugify } from '$lib/utils/slug';
import type { PageServerLoad } from './$types';

interface ReadingChoice {
	slug: string;
	title: string;
	author: string;
	tldr: string | null;
}

export const load: PageServerLoad = async ({ fetch, platform, url, locals }) => {
	if (!locals.user) redirect(303, '/login');

	const tldrPath = '/summaries-index.json';
	const fallbackPath = '/readings-fallback.json';
	const fetchAsset = (p: string) =>
		!dev && platform?.env?.ASSETS
			? platform.env.ASSETS.fetch(new URL(p, url.origin).toString())
			: fetch(p);
	const [tldrRes, fbRes] = await Promise.all([fetchAsset(tldrPath), fetchAsset(fallbackPath)]);
	const tldrs = tldrRes.ok ? ((await tldrRes.json()) as { tldrs: Record<string, string> }).tldrs : {};
	const fallback = fbRes.ok ? ((await fbRes.json()) as Record<string, { author: string; title: string }>) : {};

	const byAuthor: ReadingChoice[] = [];
	const seen = new Set<string>();
	function push(r: Reading) {
		const slug = slugify(r.pdf);
		if (seen.has(slug)) return;
		seen.add(slug);
		byAuthor.push({
			slug,
			title: r.title,
			author: r.author,
			tldr: tldrs[slug] ?? null
		});
	}
	for (const r of introductoryReadings) push(r);
	for (const w of weeks) {
		for (const r of w.readings) push(r);
		for (const r of w.additionalReadings) push(r);
	}
	for (const slug of Object.keys(fallback)) {
		if (!seen.has(slug)) {
			byAuthor.push({
				slug,
				title: fallback[slug].title,
				author: fallback[slug].author,
				tldr: tldrs[slug] ?? null
			});
			seen.add(slug);
		}
	}
	byAuthor.sort((a, b) => a.author.localeCompare(b.author));
	return { readings: byAuthor };
};
