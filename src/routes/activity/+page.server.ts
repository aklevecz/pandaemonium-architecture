import { error, redirect } from '@sveltejs/kit';
import { isInstructor } from '$lib/server/instructors';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	// 404 rather than 403 — a signed-in student shouldn't learn this page
	// exists, only that this URL isn't theirs.
	if (!isInstructor(locals.user)) error(404, 'Not found');
	return {};
};
