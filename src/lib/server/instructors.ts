import { error, type RequestEvent } from '@sveltejs/kit';
import { requireAuthAndDb, type AuthedContext } from './api';

/**
 * Who may see class-wide activity.
 *
 * /activity aggregates what the class is reading, highlighting and asking about.
 * It exposes no per-student rows, but "which passages confused people this week"
 * is still teaching data, not something a student should see about their cohort.
 *
 * Addresses are compared lowercased. Anyone with users.is_admin also passes, so
 * the flag that already exists in the schema finally means something.
 */
export const INSTRUCTOR_EMAILS = ['arielklevecz@students.calarts.edu'];

export function isInstructor(
	user: { email: string; isAdmin?: boolean } | null | undefined
): boolean {
	if (!user) return false;
	if (user.isAdmin) return true;
	return INSTRUCTOR_EMAILS.includes(user.email.trim().toLowerCase());
}

/**
 * Guard for instructor-only API routes.
 *
 * Answers 404 rather than 403: a student probing /api/activity/insights learns
 * that the route doesn't exist for them, not that it exists and they're the
 * wrong person.
 */
export function requireInstructor(
	event: Pick<RequestEvent, 'locals' | 'platform'>
): AuthedContext {
	const ctx = requireAuthAndDb(event);
	if (!isInstructor(ctx.user)) error(404, 'Not found');
	return ctx;
}
