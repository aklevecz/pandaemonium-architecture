import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { requireInstructor } from '$lib/server/instructors';
import { nameFor } from '$lib/server/commons';
import {
	cleanText,
	MAX_AVAILABILITY,
	MAX_OPEN_REQUESTS,
	MAX_REPLY,
	MAX_TOPIC,
	MEETING_STATUSES,
	notifyMeetingAnswered,
	notifyMeetingRequested,
	type MeetingStatus
} from '$lib/server/lab-desk';
import type { RequestHandler } from './$types';

// Requests to meet with the lab instructor.
//
//   POST   { topic, availability }   student asks           → the new request
//   DELETE ?id=…                     student withdraws their own open request
//   PUT    { id, status?, reply? }   instructor answers (404 for anyone else)
export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const payload = await event.request.json().catch(() => ({}));
	const topic = cleanText(payload?.topic, MAX_TOPIC);
	const availability = cleanText(payload?.availability ?? '', MAX_AVAILABILITY);
	if (!topic) error(400, `Say what you'd like to meet about (up to ${MAX_TOPIC} characters)`);
	if (availability === null)
		error(400, `Availability is longer than ${MAX_AVAILABILITY} characters`);

	// A stuck form or an impatient thumb shouldn't bury the desk in copies.
	const open = await db
		.prepare("SELECT COUNT(*) AS n FROM meeting_requests WHERE user_id = ? AND status = 'open'")
		.bind(user.id)
		.first<{ n: number }>();
	if ((open?.n ?? 0) >= MAX_OPEN_REQUESTS)
		error(
			429,
			`You already have ${MAX_OPEN_REQUESTS} open requests. Withdraw one or wait for a reply.`
		);

	const result = await db
		.prepare('INSERT INTO meeting_requests (user_id, topic, availability) VALUES (?, ?, ?)')
		.bind(user.id, topic, availability)
		.run();

	notifyMeetingRequested(
		event,
		{ name: nameFor(user.email, user.displayName), email: user.email },
		{ topic, availability }
	);
	return json({ id: result.meta.last_row_id, topic, availability, status: 'open', reply: '' });
};

export const DELETE: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const id = Number(event.url.searchParams.get('id'));
	if (!Number.isInteger(id) || id <= 0) error(400, 'Missing id');
	const result = await db
		.prepare("DELETE FROM meeting_requests WHERE id = ? AND user_id = ? AND status = 'open'")
		.bind(id, user.id)
		.run();
	if (result.meta.changes === 0) error(404, 'Not found');
	return json({ ok: true });
};

export const PUT: RequestHandler = async (event) => {
	const { db } = requireInstructor(event);
	const payload = await event.request.json().catch(() => ({}));
	const id = Number(payload?.id);
	if (!Number.isInteger(id) || id <= 0) error(400, 'Missing id');

	const current = await db
		.prepare(
			`SELECT m.topic, m.reply, m.status, u.email FROM meeting_requests m
			 JOIN users u ON u.id = m.user_id WHERE m.id = ?`
		)
		.bind(id)
		.first<{ topic: string; reply: string; status: MeetingStatus; email: string }>();
	if (!current) error(404, 'Not found');

	let status = current.status;
	if (payload?.status !== undefined) {
		if (!MEETING_STATUSES.includes(payload.status)) error(400, 'Unknown status');
		status = payload.status;
	}
	let reply = current.reply;
	if (payload?.reply !== undefined) {
		const cleaned = cleanText(payload.reply, MAX_REPLY);
		if (cleaned === null) error(400, `Reply is longer than ${MAX_REPLY} characters`);
		reply = cleaned;
	}

	await db
		.prepare(
			"UPDATE meeting_requests SET status = ?, reply = ?, updated_at = datetime('now') WHERE id = ?"
		)
		.bind(status, reply, id)
		.run();

	// Only a new or changed reply is worth an email; flipping to "done"
	// afterwards is bookkeeping.
	if (reply && reply !== current.reply)
		notifyMeetingAnswered(event, current.email, { topic: current.topic, reply, status });
	return json({ ok: true, status, reply });
};
