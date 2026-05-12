import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const slug = event.url.searchParams.get('slug');
	if (!slug) error(400, 'Missing slug');

	const row = await db
		.prepare(
			'SELECT scroll_position, text_anchor FROM bookmarks WHERE user_id = ? AND reading_slug = ?'
		)
		.bind(user.id, slug)
		.first<{ scroll_position: number; text_anchor: string | null }>();
	return json({
		position: row?.scroll_position ?? null,
		textAnchor: row?.text_anchor ?? null
	});
};

// position is kept as a fallback for when text_anchor can't be found in the
// prose (e.g., the reading content was edited). textAnchor is the new
// device-independent way to resume — first ~80 chars of the topmost
// visible paragraph at bookmark time.
export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const { slug, position, textAnchor } = await event.request.json();
	if (!slug || position === undefined) error(400, 'Missing slug or position');

	const anchor = typeof textAnchor === 'string' ? textAnchor : null;
	await db
		.prepare(
			`INSERT INTO bookmarks (user_id, reading_slug, scroll_position, text_anchor, updated_at)
			 VALUES (?, ?, ?, ?, datetime('now'))
			 ON CONFLICT (user_id, reading_slug)
			 DO UPDATE SET scroll_position = excluded.scroll_position,
			               text_anchor = excluded.text_anchor,
			               updated_at = datetime('now')`
		)
		.bind(user.id, slug, position, anchor)
		.run();
	return json({ ok: true });
};
