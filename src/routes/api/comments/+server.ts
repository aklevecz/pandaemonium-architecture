import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { isInstructor } from '$lib/server/instructors';
import { MAX_COMMENT, nameFor } from '$lib/server/commons';
import type { RequestHandler } from './$types';

// Replies under a shared highlight.
//
//   POST   /api/comments  { highlightId, body }  → the new comment
//   DELETE /api/comments?id=…                     → own comment (or instructor)
//
// A comment can only land on a highlight that is currently shared. The
// author sharing it is the moment it becomes a conversation; before that
// the highlight is private and nobody else can even name its id.
export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const payload = await event.request.json().catch(() => ({}));
	const highlightId = Number(payload?.highlightId);
	const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
	if (!Number.isInteger(highlightId) || highlightId <= 0) error(400, 'Missing highlightId');
	if (!body) error(400, 'Empty comment');
	if (body.length > MAX_COMMENT) error(400, `Comment is longer than ${MAX_COMMENT} characters`);

	const target = await db
		.prepare('SELECT id FROM highlights WHERE id = ? AND shared_at IS NOT NULL')
		.bind(highlightId)
		.first<{ id: number }>();
	// 404 for private and missing alike: the id of someone's private
	// highlight shouldn't be confirmable by probing.
	if (!target) error(404, 'Not found');

	const result = await db
		.prepare('INSERT INTO comments (highlight_id, user_id, body) VALUES (?, ?, ?)')
		.bind(highlightId, user.id, body)
		.run();
	const row = await db
		.prepare('SELECT created_at FROM comments WHERE id = ?')
		.bind(result.meta.last_row_id)
		.first<{ created_at: string }>();

	return json({
		id: result.meta.last_row_id,
		userId: user.id,
		author: nameFor(user.email, user.displayName),
		body,
		created_at: row?.created_at ?? new Date().toISOString()
	});
};

export const DELETE: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const id = Number(event.url.searchParams.get('id'));
	if (!Number.isInteger(id) || id <= 0) error(400, 'Missing id');

	// Instructors may remove any comment; everyone else only their own.
	const result = isInstructor(user)
		? await db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run()
		: await db.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?').bind(id, user.id).run();
	if (result.meta.changes === 0) error(404, 'Not found');
	return json({ ok: true });
};
