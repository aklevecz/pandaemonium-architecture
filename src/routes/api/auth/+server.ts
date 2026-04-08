import { json, error } from '@sveltejs/kit';
import { hashPassword, verifyPassword, generateSessionId } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const { action, email, password } = await request.json();

	if (!email || !password) {
		error(400, 'Email and password required');
	}

	if (action === 'signup') {
		const existing = await db
			.prepare('SELECT id FROM users WHERE email = ?')
			.bind(email)
			.first();
		if (existing) {
			error(409, 'Account already exists');
		}

		const passwordHash = await hashPassword(password);
		const result = await db
			.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
			.bind(email, passwordHash)
			.run();

		const userId = result.meta.last_row_id;
		const sessionId = generateSessionId();
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

		await db
			.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
			.bind(sessionId, userId, expiresAt)
			.run();

		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60
		});

		return json({ email });
	}

	if (action === 'login') {
		const user = await db
			.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
			.bind(email)
			.first<{ id: number; email: string; password_hash: string }>();

		if (!user || !(await verifyPassword(password, user.password_hash))) {
			error(401, 'Invalid email or password');
		}

		const sessionId = generateSessionId();
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

		await db
			.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
			.bind(sessionId, user.id, expiresAt)
			.run();

		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60
		});

		return json({ email: user.email });
	}

	if (action === 'logout') {
		const sessionId = cookies.get('session');
		if (sessionId) {
			await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
		}
		cookies.delete('session', { path: '/' });
		return json({ ok: true });
	}

	error(400, 'Invalid action');
};
