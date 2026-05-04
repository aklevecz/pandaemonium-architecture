import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const slug = event.url.searchParams.get('slug');
	if (!slug) error(400, 'Missing slug');

	const row = await db
		.prepare('SELECT scroll_position FROM bookmarks WHERE user_id = ? AND reading_slug = ?')
		.bind(user.id, slug)
		.first<{ scroll_position: number }>();
	return json({ position: row?.scroll_position ?? null });
};

export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { slug, position } = await event.request.json();
	if (!slug || position === undefined) error(400, 'Missing slug or position');

	await db
		.prepare(
			`INSERT INTO bookmarks (user_id, reading_slug, scroll_position, updated_at)
			 VALUES (?, ?, ?, datetime('now'))
			 ON CONFLICT (user_id, reading_slug)
			 DO UPDATE SET scroll_position = ?, updated_at = datetime('now')`
		)
		.bind(user.id, slug, position, position)
		.run();
	return json({ ok: true });
};
