import { isInstructor } from '$lib/server/instructors';
import { visibleLabs } from '$lib/server/labs';
import { LAB_CONTACT, loadAllMeetings, loadFuserSheet, loadMyMeetings } from '$lib/server/lab-desk';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const instructor = isInstructor(locals.user);
	// Only the summary fields the index renders — slide text stays on the server.
	const labs = visibleLabs(instructor).map(({ number, title, stance, blurb, draft, slides }) => ({
		number,
		title,
		stance,
		blurb,
		draft: draft ?? false,
		slideCount: slides.length
	}));

	// The lab desk is for signed-in students. Signed out, `desk` is null and
	// the contact address never reaches the page.
	const db = platform?.env?.DB;
	const user = locals.user;
	const desk =
		user && db
			? {
					contact: LAB_CONTACT,
					accountEmail: user.email,
					isInstructor: instructor,
					myMeetings: await loadMyMeetings(db, user.id),
					fuserSheet: await loadFuserSheet(db, { id: user.id, isInstructor: instructor }),
					allMeetings: instructor ? await loadAllMeetings(db) : null
				}
			: null;

	return { labs, desk };
};
