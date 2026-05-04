import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const slug = event.url.searchParams.get('slug');
	if (!slug) error(400, 'Missing slug');

	const highlights = await db
		.prepare(
			'SELECT id, text, note, created_at FROM highlights WHERE user_id = ? AND reading_slug = ? ORDER BY created_at ASC'
		)
		.bind(user.id, slug)
		.all<{ id: number; text: string; note: string; created_at: string }>();
	return json(highlights.results);
};

export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { slug, text, note } = await event.request.json();
	if (!slug || !text) error(400, 'Missing slug or text');

	const result = await db
		.prepare('INSERT INTO highlights (user_id, reading_slug, text, note) VALUES (?, ?, ?, ?)')
		.bind(user.id, slug, text, note || '')
		.run();
	return json({ id: result.meta.last_row_id, text, note });
};

export const PUT: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { id, note } = await event.request.json();
	if (!id) error(400, 'Missing id');

	await db
		.prepare('UPDATE highlights SET note = ? WHERE id = ? AND user_id = ?')
		.bind(note || '', id, user.id)
		.run();
	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const id = event.url.searchParams.get('id');
	if (!id) error(400, 'Missing id');

	await db
		.prepare('DELETE FROM highlights WHERE id = ? AND user_id = ?')
		.bind(Number(id), user.id)
		.run();
	return json({ ok: true });
};
