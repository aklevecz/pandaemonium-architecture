import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	const sessionId = event.cookies.get('session');
	if (sessionId && event.platform?.env?.DB) {
		const db = event.platform.env.DB;
		const row = await db
			.prepare(
				`SELECT users.id, users.email, users.is_admin FROM sessions
				 JOIN users ON users.id = sessions.user_id
				 WHERE sessions.id = ? AND sessions.expires_at > datetime('now')`
			)
			.bind(sessionId)
			.first<{ id: number; email: string; is_admin: number | null }>();

		if (row) {
			event.locals.user = { id: row.id, email: row.email, isAdmin: !!row.is_admin };
		}
	}

	return resolve(event);
};
