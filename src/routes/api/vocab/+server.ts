import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const slug = event.url.searchParams.get('slug');
	if (!slug) error(400, 'Missing slug');

	const rows = await db
		.prepare(
			'SELECT id, word, definition, context, created_at FROM vocab WHERE user_id = ? AND reading_slug = ? ORDER BY created_at DESC'
		)
		.bind(user.id, slug)
		.all<{ id: number; word: string; definition: string; context: string | null; created_at: string }>();
	return json(rows.results);
};

export const DELETE: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const id = event.url.searchParams.get('id');
	if (!id) error(400, 'Missing id');

	await db
		.prepare('DELETE FROM vocab WHERE id = ? AND user_id = ?')
		.bind(Number(id), user.id)
		.run();
	return json({ ok: true });
};
