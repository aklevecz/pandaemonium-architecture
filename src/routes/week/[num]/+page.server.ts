import { isInstructor } from '$lib/server/instructors';
import { getVisibleLab } from '$lib/server/labs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const lab = getVisibleLab(Number(params.num), isInstructor(locals.user));
	// Just the card fields; a hidden deck yields null and no card renders.
	return {
		lab: lab
			? {
					number: lab.number,
					title: lab.title,
					stance: lab.stance,
					blurb: lab.blurb,
					draft: lab.draft ?? false
				}
			: null
	};
};
