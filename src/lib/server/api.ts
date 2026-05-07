import { error, type RequestEvent } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

export interface AuthedContext {
	user: { id: number; email: string; isAdmin: boolean };
	db: D1Database;
}

// Every authenticated API handler starts with the same four lines:
//   if (!locals.user) error(401, ...)
//   const db = platform?.env?.DB
//   if (!db) error(500, ...)
// Centralize that here so changes (e.g. adding rate-limit checks) happen once.
export function requireAuthAndDb(event: Pick<RequestEvent, 'locals' | 'platform'>): AuthedContext {
	if (!event.locals.user) error(401, 'Not logged in');
	const db = event.platform?.env?.DB;
	if (!db) error(500, 'Database not available');
	return { user: event.locals.user, db };
}
