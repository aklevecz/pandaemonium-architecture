import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

interface PassageRow {
	text: string;
	students: number;
	picks: number;
	first_at: string;
	last_at: string;
	avg_position: number | null;
}

interface ReadingSummary {
	slug: string;
	explainStudents: number;
	explainEvents: number;
	highlightStudents: number;
	highlightEvents: number;
}

// Aggregated counts across the corpus + per-passage breakdown for one
// reading. No per-student rows are exposed — the dashboard is for spotting
// confusing or thought-provoking passages, not surveilling individuals.
//
//   GET /api/instructor/insights              → corpus summary
//   GET /api/instructor/insights?slug=…       → per-reading passage details
export const GET: RequestHandler = async (event) => {
	const { db } = requireAuthAndDb(event);

	const slug = event.url.searchParams.get('slug');

	if (slug) {
		const explains = await db
			.prepare(
				`SELECT text,
				        COUNT(DISTINCT user_id) as students,
				        COUNT(*) as picks,
				        MIN(created_at) as first_at,
				        MAX(created_at) as last_at,
				        AVG(position) as avg_position
				 FROM explain_events
				 WHERE reading_slug = ?
				 GROUP BY text
				 ORDER BY students DESC, picks DESC, last_at DESC
				 LIMIT 100`
			)
			.bind(slug)
			.all<PassageRow>();

		const highlights = await db
			.prepare(
				`SELECT text,
				        COUNT(DISTINCT user_id) as students,
				        COUNT(*) as picks,
				        MIN(created_at) as first_at,
				        MAX(created_at) as last_at,
				        NULL as avg_position
				 FROM highlights
				 WHERE reading_slug = ?
				 GROUP BY text
				 ORDER BY students DESC, picks DESC, last_at DESC
				 LIMIT 100`
			)
			.bind(slug)
			.all<PassageRow>();

		return json({
			slug,
			explains: explains.results ?? [],
			highlights: highlights.results ?? []
		});
	}

	// Corpus summary: per-reading counts so the dashboard lists readings by
	// engagement intensity.
	const explainsBy = await db
		.prepare(
			`SELECT reading_slug,
			        COUNT(DISTINCT user_id) as students,
			        COUNT(*) as events
			 FROM explain_events
			 GROUP BY reading_slug`
		)
		.all<{ reading_slug: string; students: number; events: number }>();

	const highlightsBy = await db
		.prepare(
			`SELECT reading_slug,
			        COUNT(DISTINCT user_id) as students,
			        COUNT(*) as events
			 FROM highlights
			 GROUP BY reading_slug`
		)
		.all<{ reading_slug: string; students: number; events: number }>();

	const map = new Map<string, ReadingSummary>();
	for (const r of explainsBy.results ?? []) {
		const m = map.get(r.reading_slug) ?? {
			slug: r.reading_slug,
			explainStudents: 0,
			explainEvents: 0,
			highlightStudents: 0,
			highlightEvents: 0
		};
		m.explainStudents = r.students;
		m.explainEvents = r.events;
		map.set(r.reading_slug, m);
	}
	for (const r of highlightsBy.results ?? []) {
		const m = map.get(r.reading_slug) ?? {
			slug: r.reading_slug,
			explainStudents: 0,
			explainEvents: 0,
			highlightStudents: 0,
			highlightEvents: 0
		};
		m.highlightStudents = r.students;
		m.highlightEvents = r.events;
		map.set(r.reading_slug, m);
	}

	const totals = {
		uniqueStudents: 0,
		explainEvents: 0,
		highlightEvents: 0
	};
	const studentsRow = await db
		.prepare(
			`SELECT COUNT(*) as n FROM (
			  SELECT user_id FROM explain_events
			  UNION
			  SELECT user_id FROM highlights
			)`
		)
		.first<{ n: number }>();
	totals.uniqueStudents = studentsRow?.n ?? 0;
	for (const r of map.values()) {
		totals.explainEvents += r.explainEvents;
		totals.highlightEvents += r.highlightEvents;
	}

	const readings = [...map.values()].sort(
		(a, b) =>
			b.explainEvents + b.highlightEvents - (a.explainEvents + a.highlightEvents)
	);
	return json({ totals, readings });
};
