import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { DEFAULT_HIGHLIGHT_COLOR, isHighlightColor } from '$lib/highlight-colors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const slug = event.url.searchParams.get('slug');
	if (!slug) error(400, 'Missing slug');

	const highlights = await db
		.prepare(
			'SELECT id, text, note, color, created_at, shared_at FROM highlights WHERE user_id = ? AND reading_slug = ? ORDER BY created_at ASC'
		)
		.bind(user.id, slug)
		.all<{
			id: number;
			text: string;
			note: string;
			color: string;
			created_at: string;
			shared_at: string | null;
		}>();
	return json(highlights.results);
};

export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { slug, text, note, color } = await event.request.json();
	if (!slug || !text) error(400, 'Missing slug or text');
	// Unknown colours fall back rather than 400ing — a stale client shouldn't
	// lose the student's highlight over a palette mismatch.
	const hlColor = isHighlightColor(color) ? color : DEFAULT_HIGHLIGHT_COLOR;

	const result = await db
		.prepare(
			'INSERT INTO highlights (user_id, reading_slug, text, note, color) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(user.id, slug, text, note || '', hlColor)
		.run();
	return json({ id: result.meta.last_row_id, text, note, color: hlColor });
};

// Updates `note`, `text`, `color` and/or `shared` on an existing highlight. `text` is
// changed when a student "extends" a highlight — tap Extend → re-select → tap
// Update, the existing row's range is overwritten in place rather than
// creating a new highlight. `color` is changed from the swatch row on the
// in-text highlight menu. `shared` puts the highlight in (or pulls it out of)
// the class Commons; unsharing keeps the row and its note but hides the
// thread under it until it is shared again.
export const PUT: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { id, text, note, color, shared } = await event.request.json();
	if (!id) error(400, 'Missing id');

	const sets: string[] = [];
	const binds: unknown[] = [];
	if (typeof text === 'string' && text.trim().length >= 3) {
		sets.push('text = ?');
		binds.push(text);
	}
	if (typeof note === 'string') {
		sets.push('note = ?');
		binds.push(note);
	}
	// Only an unrecognised colour is rejected here. Unlike POST there's no
	// highlight at risk of being lost, and silently writing yellow over the
	// colour the user asked for would be worse than a clear failure.
	if (color !== undefined) {
		if (!isHighlightColor(color)) error(400, 'Unknown highlight color');
		sets.push('color = ?');
		binds.push(color);
	}
	if (typeof shared === 'boolean') {
		sets.push(shared ? "shared_at = COALESCE(shared_at, datetime('now'))" : 'shared_at = NULL');
	}
	if (sets.length === 0) error(400, 'Nothing to update');

	binds.push(id, user.id);
	await db
		.prepare(`UPDATE highlights SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
		.bind(...binds)
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
