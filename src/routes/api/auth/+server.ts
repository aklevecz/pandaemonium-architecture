import { json, error } from '@sveltejs/kit';
import {
	generateToken,
	hashToken,
	tokenExpiry,
	isAllowedEmail,
	isRateLimited,
	looksLikeEmail,
	loginEmail,
	normalizeEmail
} from '$lib/server/login-link';
import type { RequestHandler } from './$types';

const FROM = { email: 'login@calarts.app', name: 'Pandaemonium Architecture' };

export const POST: RequestHandler = async (event) => {
	const { request, cookies, platform, url } = event;
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const { action, email: rawEmail } = await request.json();

	if (action === 'logout') {
		const sessionId = cookies.get('session');
		if (sessionId) {
			await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
		}
		cookies.delete('session', { path: '/' });
		return json({ ok: true });
	}

	// Request a sign-in link. There is no password path any more: 'login' and
	// 'signup' collapse into one action, since an address either has an account
	// or gets one on first redemption.
	if (action === 'request') {
		const email = normalizeEmail(rawEmail ?? '');
		if (!looksLikeEmail(email)) error(400, 'Enter a valid email address');

		// Always answer the same way. Whether an address is enrolled, already
		// registered, or rate-limited is not something an unauthenticated caller
		// gets to enumerate.
		const ok = json({ ok: true });

		if (!isAllowedEmail(email)) return ok;
		if (await isRateLimited(db, email)) return ok;

		const emailBinding = platform?.env?.EMAIL;
		if (!emailBinding) error(500, 'Email sending is not configured');

		const token = generateToken();
		await db
			.prepare(
				'INSERT INTO login_tokens (token_hash, email, expires_at, request_ip) VALUES (?, ?, ?, ?)'
			)
			.bind(
				await hashToken(token),
				email,
				tokenExpiry(),
				request.headers.get('cf-connecting-ip') ?? null
			)
			.run();

		// Built from the host actually being used, so a link from
		// atek639.calarts.app doesn't send someone to a211h.yaytso.art and
		// silently land them in a different cookie scope.
		const link = `${url.origin}/auth/verify?token=${token}`;
		const { subject, html, text } = loginEmail(link);

		try {
			await emailBinding.send({ to: email, from: FROM, subject, html, text });
		} catch (err) {
			// Don't strand the token: if the mail never went, the row is dead
			// weight that still counts against the address's hourly budget.
			await db
				.prepare('DELETE FROM login_tokens WHERE token_hash = ?')
				.bind(await hashToken(token))
				.run();
			console.error('login email failed', (err as { code?: string })?.code, err);
			error(502, 'Could not send the sign-in email. Try again in a moment.');
		}

		return ok;
	}

	error(400, 'Invalid action');
};
