import { redirect, error } from '@sveltejs/kit';
import { redeemLoginToken } from '$lib/server/login-link';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const result = await redeemLoginToken(db, url.searchParams.get('token') ?? '');

	// Expired, already used, or forged. Send them back to request a fresh one
	// rather than explaining which of those it was.
	if (!result) redirect(303, '/login?expired=1');

	cookies.set('session', result.sessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 30 * 24 * 60 * 60
	});

	// `next` lets a future "you must sign in to do that" flow round-trip the
	// user back where they were. Only relative paths — an absolute URL here
	// would make the sign-in link an open redirect.
	const next = url.searchParams.get('next');
	const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
	redirect(303, dest);
};
