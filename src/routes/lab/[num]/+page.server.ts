import { error } from '@sveltejs/kit';
import { isInstructor } from '$lib/server/instructors';
import { getVisibleLab } from '$lib/server/labs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const lab = getVisibleLab(Number(params.num), isInstructor(locals.user));
	// 404 rather than 403, matching /activity: an unpublished deck should not
	// announce that it exists and is being withheld.
	if (!lab) error(404, 'Not found');
	return { lab };
};
