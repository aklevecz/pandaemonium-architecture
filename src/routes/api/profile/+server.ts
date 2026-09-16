import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { cleanDisplayName, MAX_DISPLAY_NAME, nameFor } from '$lib/server/commons';
import type { RequestHandler } from './$types';

// The name classmates see in the Commons.
//
//   GET /api/profile                    → { displayName, shownAs }
//   PUT /api/profile { displayName }    → same, after saving
export const GET: RequestHandler = async (event) => {
	const { user } = requireAuthAndDb(event);
	return json({
		displayName: user.displayName,
		shownAs: nameFor(user.email, user.displayName)
	});
};

export const PUT: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const payload = await event.request.json().catch(() => ({}));
	const name = cleanDisplayName(payload?.displayName);
	if (!name) error(400, `Name must be 1–${MAX_DISPLAY_NAME} characters`);

	await db.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(name, user.id).run();
	return json({ displayName: name, shownAs: name });
};
