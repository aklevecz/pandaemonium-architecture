import { isInstructor } from '$lib/server/instructors';
import { getVisibleLab } from '$lib/server/labs';
import { loadCommons, slugsForWeek } from '$lib/server/commons';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const weekNumber = Number(params.num);
	const lab = getVisibleLab(weekNumber, isInstructor(locals.user));

	// A taste of the week's Commons for signed-in students: the three most
	// recent shares and how many there are in all. Signed-out visitors get
	// nothing here rather than a teaser of classmates' words.
	const db = platform?.env?.DB;
	let commons: {
		total: number;
		latest: { id: number; text: string; author: string; replies: number }[];
	} | null = null;
	if (locals.user && db) {
		const slugs = slugsForWeek(weekNumber);
		const entries = await loadCommons(db, { slugs });
		commons = {
			total: entries.length,
			latest: entries.slice(0, 3).map((e) => ({
				id: e.id,
				text: e.text.length > 220 ? e.text.slice(0, 220).trimEnd() + '…' : e.text,
				author: e.author,
				replies: e.comments.length
			}))
		};
	}
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
			: null,
		commons
	};
};
