import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const slug = event.url.searchParams.get('slug');
	if (!slug) error(400, 'Missing slug');

	const notes = await db
		.prepare(
			'SELECT id, content, created_at, updated_at FROM notes WHERE user_id = ? AND reading_slug = ? ORDER BY created_at DESC'
		)
		.bind(user.id, slug)
		.all<{ id: number; content: string; created_at: string; updated_at: string }>();
	return json(notes.results);
};

export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { slug, content } = await event.request.json();
	if (!slug || !content) error(400, 'Missing slug or content');

	const result = await db
		.prepare('INSERT INTO notes (user_id, reading_slug, content) VALUES (?, ?, ?)')
		.bind(user.id, slug, content)
		.run();
	return json({ id: result.meta.last_row_id, content });
};

export const PUT: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { id, content } = await event.request.json();
	if (!id || !content) error(400, 'Missing id or content');

	await db
		.prepare("UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
		.bind(content, id, user.id)
		.run();
	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const id = event.url.searchParams.get('id');
	if (!id) error(400, 'Missing id');

	await db
		.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
		.bind(Number(id), user.id)
		.run();
	return json({ ok: true });
};
