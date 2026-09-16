import { redirect } from '@sveltejs/kit';
import { weeks } from '$lib/data/syllabus';
import { isInstructor } from '$lib/server/instructors';
import { loadCommons, nameFor, slugsForWeek } from '$lib/server/commons';
import type { PageServerLoad } from './$types';

// The Commons is for the class, so it needs a sign-in — but unlike the
// Activity dashboard it is for every student, not just the instructor.
export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, `/login?next=${encodeURIComponent('/commons' + url.search)}`);
	const db = platform?.env?.DB;

	const weekParam = url.searchParams.get('week');
	const weekNumber = weekParam && /^\d+$/.test(weekParam) ? Number(weekParam) : null;
	const week = weekNumber !== null ? weeks.find((w) => w.number === weekNumber) : undefined;

	const entries = db ? await loadCommons(db, week ? { slugs: slugsForWeek(week.number) } : {}) : [];

	// Which weeks have anything shared, so the filter only offers live ones.
	// Computed from the unfiltered feed when no week is selected; when one
	// is, run the cheap count so the chips don't collapse to a single week.
	let weeksWithShares: number[];
	if (week && db) {
		const res = await db
			.prepare('SELECT DISTINCT reading_slug FROM highlights WHERE shared_at IS NOT NULL')
			.bind()
			.all<{ reading_slug: string }>();
		const slugs = new Set((res.results ?? []).map((r: { reading_slug: string }) => r.reading_slug));
		weeksWithShares = weeks
			.filter((w) => slugsForWeek(w.number).some((s) => slugs.has(s)))
			.map((w) => w.number);
	} else {
		weeksWithShares = [
			...new Set(entries.map((e) => e.reading.weekNumber).filter((n): n is number => n !== null))
		].sort((a, b) => a - b);
	}

	return {
		entries,
		week: week ? { number: week.number, title: week.title } : null,
		weeksWithShares,
		viewer: {
			id: locals.user.id,
			name: nameFor(locals.user.email, locals.user.displayName),
			hasName: !!locals.user.displayName?.trim(),
			isInstructor: isInstructor(locals.user)
		}
	};
};
