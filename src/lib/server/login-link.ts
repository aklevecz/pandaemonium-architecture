// Magic-link sign-in: issue a single-use token, email it, redeem it once.
//
// Replaces password auth. Nothing to forget, nothing to reset, and the address
// is verified by construction — receiving the link is the proof of ownership.

import { generateSessionId } from './auth';

/**
 * Restrict who may sign in, by email domain. EMPTY MEANS OPEN: any address can
 * request a link.
 *
 * To limit sign-in to the class, uncomment the CalArts entry below. Matching is
 * on the exact domain or any subdomain of it, so `calarts.edu` also admits
 * `students.calarts.edu`; both are listed anyway so the intent is explicit and
 * a change to one doesn't silently depend on the suffix rule.
 */
export const ALLOWED_EMAIL_DOMAINS: string[] = [
	// 'calarts.edu',
	// 'students.calarts.edu'
];

const TOKEN_TTL_MINUTES = 15;

// Throttle per address: enough for a genuine retry, not enough to weaponise
// the sender into a mail bomb aimed at someone else's inbox.
const MAX_REQUESTS_PER_HOUR = 5;

export function isAllowedEmail(email: string): boolean {
	if (ALLOWED_EMAIL_DOMAINS.length === 0) return true;
	const domain = email.split('@')[1]?.toLowerCase();
	if (!domain) return false;
	return ALLOWED_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

export function normalizeEmail(email: string): string {
	return String(email).trim().toLowerCase();
}

// Deliberately strict-ish but not RFC-complete; the real validation is whether
// the message arrives.
export function looksLikeEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function tokenExpiry(): string {
	return new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
}

/** True when this address has asked for too many links in the last hour. */
export async function isRateLimited(db: App.Platform['env']['DB'], email: string): Promise<boolean> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS n FROM login_tokens
			 WHERE email = ? AND created_at > datetime('now', '-1 hour')`
		)
		.bind(email)
		.first<{ n: number }>();
	return (row?.n ?? 0) >= MAX_REQUESTS_PER_HOUR;
}

export function loginEmail(link: string): { subject: string; html: string; text: string } {
	const subject = 'Your sign-in link — Pandaemonium Architecture';
	const text = [
		'Sign in to Pandaemonium Architecture',
		'',
		link,
		'',
		`This link works once and expires in ${TOKEN_TTL_MINUTES} minutes.`,
		"If you didn't request it, you can ignore this email — no account was created or changed."
	].join('\n');

	// Table-free, inline-styled, single column: the layout most mail clients
	// render without argument.
	const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f5f2;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2ded4;padding:32px;">
    <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7a7364;">Pandaemonium Architecture</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:normal;">Sign in</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">Use the button below to sign in. It works once and expires in ${TOKEN_TTL_MINUTES} minutes.</p>
    <p style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 22px;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.5px;">Sign in</a>
    </p>
    <p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7a7364;">Or paste this address into your browser:</p>
    <p style="margin:0 0 24px;font-family:Helvetica,Arial,sans-serif;font-size:12px;word-break:break-all;color:#4a4a4a;"><a href="${link}" style="color:#3a5a8c;">${link}</a></p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #e2ded4;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a7364;">If you didn't request this, ignore it — no account was created or changed.</p>
  </div>
</body></html>`;

	return { subject, html, text };
}

/**
 * Redeem a token. Kept in this module (rather than the /auth/verify page) so
 * every write to `sessions` and `users` lives beside the code that issues them.
 */
export async function redeemLoginToken(
	db: App.Platform['env']['DB'],
	token: string
): Promise<{ email: string; sessionId: string } | null> {
	if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

	const row = await db
		.prepare(
			`SELECT token_hash, email FROM login_tokens
			 WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`
		)
		.bind(await hashToken(token))
		.first<{ token_hash: string; email: string }>();
	if (!row) return null;

	// Mark used before minting the session, and only proceed if this statement
	// actually claimed the row — two concurrent redemptions of the same link
	// (mail scanners prefetch) must not both produce a session.
	const claim = await db
		.prepare('UPDATE login_tokens SET used_at = datetime(\'now\') WHERE token_hash = ? AND used_at IS NULL')
		.bind(row.token_hash)
		.run();
	if (claim.meta.changes !== 1) return null;

	let user = await db
		.prepare('SELECT id FROM users WHERE email = ?')
		.bind(row.email)
		.first<{ id: number }>();

	if (!user) {
		// See migrations/0010: password_hash is NOT NULL, and this sentinel can
		// never match a real '<hex>:<hex>' digest.
		const created = await db
			.prepare(
				"INSERT INTO users (email, password_hash, email_verified_at) VALUES (?, '!passwordless', datetime('now'))"
			)
			.bind(row.email)
			.run();
		user = { id: Number(created.meta.last_row_id) };
	} else {
		await db
			.prepare("UPDATE users SET email_verified_at = datetime('now') WHERE id = ?")
			.bind(user.id)
			.run();
	}

	const sessionId = generateSessionId();
	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(sessionId, user.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
		.run();

	return { email: row.email, sessionId };
}
