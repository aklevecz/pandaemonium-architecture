import { isInstructor } from '$lib/server/instructors';
import { visibleLabs } from '$lib/server/labs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Only the summary fields the index renders — slide text stays on the server.
	const labs = visibleLabs(isInstructor(locals.user)).map(
		({ number, title, stance, blurb, draft, slides }) => ({
			number,
			title,
			stance,
			blurb,
			draft: draft ?? false,
			slideCount: slides.length
		})
	);
	return { labs };
};
