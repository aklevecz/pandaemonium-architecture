import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const slug = url.searchParams.get('slug');
	if (!slug) error(400, 'Missing slug');

	const highlights = await db
		.prepare(
			'SELECT id, text, note, created_at FROM highlights WHERE user_id = ? AND reading_slug = ? ORDER BY created_at ASC'
		)
		.bind(locals.user.id, slug)
		.all<{ id: number; text: string; note: string; created_at: string }>();

	return json(highlights.results);
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const { slug, text, note } = await request.json();
	if (!slug || !text) error(400, 'Missing slug or text');

	const result = await db
		.prepare('INSERT INTO highlights (user_id, reading_slug, text, note) VALUES (?, ?, ?, ?)')
		.bind(locals.user.id, slug, text, note || '')
		.run();

	return json({ id: result.meta.last_row_id, text, note });
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const { id, note } = await request.json();
	if (!id) error(400, 'Missing id');

	await db
		.prepare('UPDATE highlights SET note = ? WHERE id = ? AND user_id = ?')
		.bind(note || '', id, locals.user.id)
		.run();

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const id = url.searchParams.get('id');
	if (!id) error(400, 'Missing id');

	await db
		.prepare('DELETE FROM highlights WHERE id = ? AND user_id = ?')
		.bind(Number(id), locals.user.id)
		.run();

	return json({ ok: true });
};
