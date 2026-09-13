import { redirect } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { loadNotebook } from '$lib/server/notebook';
import { buildReadingMetaList } from '$lib/search';
import { dataUrl } from '$lib/server/data-url';
import type { NotebookReading } from '$lib/notebook';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(303, '/login');
	event.setHeaders({ 'Cache-Control': 'private, no-store' });
	const { user, db } = requireAuthAndDb(event);
	const entries = await loadNotebook(db, user.id);
	const readings: Record<string, NotebookReading> = Object.fromEntries(
		buildReadingMetaList().map((r) => [
			r.slug,
			{ title: r.title, author: r.author, weekNumber: r.weekNumber }
		])
	);
	const missing = [...new Set(entries.map((e) => e.slug))].filter((slug) => !readings[slug]);
	if (missing.length) {
		try {
			const response = await event.fetch(dataUrl('/readings-fallback.json', event.url.origin));
			if (response.ok) {
				const fallback: Record<string, NotebookReading> = await response.json();
				for (const slug of missing) if (fallback[slug]) readings[slug] = fallback[slug];
			}
		} catch {
			/* Saved work is still available when reading metadata is not. */
		}
	}
	for (const slug of missing) readings[slug] ??= { title: slug.replace(/-/g, ' '), author: '' };
	return { entries, readings };
};
