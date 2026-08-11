import { isInstructor } from '$lib/server/instructors';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		// Drives whether the Activity link renders. The route and its API
		// enforce this independently — this only avoids showing a dead link.
		isInstructor: isInstructor(locals.user)
	};
};
