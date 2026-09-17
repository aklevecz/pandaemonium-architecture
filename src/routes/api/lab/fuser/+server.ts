import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { requireInstructor } from '$lib/server/instructors';
import { cleanEmail, cleanText, FUSER_STATUSES, MAX_NOTE } from '$lib/server/lab-desk';
import type { RequestHandler } from './$types';

// The Fuser access sign-up sheet. One row per student.
//
//   POST   { fuserEmail, note? }   sign up, or correct your own row
//   DELETE                         take your name off the sheet
//   PUT    { id, status }          instructor marks access granted (404 otherwise)
export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const payload = await event.request.json().catch(() => ({}));
	const fuserEmail = cleanEmail(payload?.fuserEmail);
	const note = cleanText(payload?.note ?? '', MAX_NOTE);
	if (!fuserEmail) error(400, 'Enter the email address your Fuser account uses');
	if (note === null) error(400, `Note is longer than ${MAX_NOTE} characters`);

	// Correcting the address after access was granted puts the row back in
	// the queue: the grant was for the old address.
	await db
		.prepare(
			`INSERT INTO fuser_signups (user_id, fuser_email, note) VALUES (?, ?, ?)
			 ON CONFLICT(user_id) DO UPDATE SET
			   note = excluded.note,
			   status = CASE WHEN fuser_signups.fuser_email = excluded.fuser_email
			                 THEN fuser_signups.status ELSE 'requested' END,
			   granted_at = CASE WHEN fuser_signups.fuser_email = excluded.fuser_email
			                     THEN fuser_signups.granted_at ELSE NULL END,
			   fuser_email = excluded.fuser_email`
		)
		.bind(user.id, fuserEmail, note)
		.run();
	const row = await db
		.prepare('SELECT id, status FROM fuser_signups WHERE user_id = ?')
		.bind(user.id)
		.first<{ id: number; status: string }>();
	return json({ id: row?.id, fuserEmail, note, status: row?.status ?? 'requested' });
};

export const DELETE: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	await db.prepare('DELETE FROM fuser_signups WHERE user_id = ?').bind(user.id).run();
	return json({ ok: true });
};

export const PUT: RequestHandler = async (event) => {
	const { db } = requireInstructor(event);
	const payload = await event.request.json().catch(() => ({}));
	const id = Number(payload?.id);
	if (!Number.isInteger(id) || id <= 0) error(400, 'Missing id');
	if (!FUSER_STATUSES.includes(payload?.status)) error(400, 'Unknown status');

	const result = await db
		.prepare(
			`UPDATE fuser_signups SET status = ?,
			   granted_at = CASE WHEN ? = 'granted' THEN datetime('now') ELSE NULL END
			 WHERE id = ?`
		)
		.bind(payload.status, payload.status, id)
		.run();
	if (result.meta.changes === 0) error(404, 'Not found');
	return json({ ok: true });
};
