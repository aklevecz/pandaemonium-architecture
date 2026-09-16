import type { D1Database } from '@cloudflare/workers-types';
import { buildReadingMetaList, type ReadingMeta } from '$lib/search';

/**
 * The Commons: shared highlights and the conversation under each one.
 *
 * Only highlights with `shared_at` set leave their author's notebook. Every
 * query here filters on that, so a private highlight can't surface through a
 * comment join or a week filter. Explain events are deliberately absent:
 * they remain count-only teaching data on the instructor dashboard.
 */

export interface CommonsComment {
	id: number;
	userId: number;
	author: string;
	body: string;
	created_at: string;
}

export interface CommonsEntry {
	id: number;
	slug: string;
	text: string;
	note: string;
	color: string;
	userId: number;
	author: string;
	shared_at: string;
	reading: { title: string; author: string; weekNumber: number | null; weekTitle: string | null };
	comments: CommonsComment[];
}

export const MAX_DISPLAY_NAME = 40;
export const MAX_COMMENT = 2000;

/** What classmates see. Falls back to the part of the email before the @. */
export function nameFor(email: string, displayName: string | null | undefined): string {
	const trimmed = displayName?.trim();
	if (trimmed) return trimmed;
	return email.split('@')[0] || 'someone';
}

/** Collapses whitespace and rejects empty or over-long names. */
export function cleanDisplayName(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const name = raw.replace(/\s+/g, ' ').trim();
	if (!name || name.length > MAX_DISPLAY_NAME) return null;
	return name;
}

let metaCache: Map<string, ReadingMeta> | null = null;
function readingMeta(slug: string): ReadingMeta | undefined {
	if (!metaCache) {
		metaCache = new Map();
		for (const m of buildReadingMetaList()) metaCache.set(m.slug, m);
	}
	return metaCache.get(slug);
}

/** Slugs of every reading assigned in a given week (primary and additional). */
export function slugsForWeek(weekNumber: number): string[] {
	return buildReadingMetaList()
		.filter((m) => m.weekNumber === weekNumber)
		.map((m) => m.slug);
}

interface SharedRow {
	id: number;
	reading_slug: string;
	text: string;
	note: string;
	color: string;
	shared_at: string;
	user_id: number;
	email: string;
	display_name: string | null;
}

interface CommentRow {
	id: number;
	highlight_id: number;
	user_id: number;
	body: string;
	created_at: string;
	email: string;
	display_name: string | null;
}

/**
 * Shared highlights, newest share first, each with its comments in order.
 * `slugs` narrows to a set of readings (a week); `limit` caps the feed.
 */
export async function loadCommons(
	db: D1Database,
	opts: { slugs?: string[]; limit?: number } = {}
): Promise<CommonsEntry[]> {
	const where = ['h.shared_at IS NOT NULL'];
	const binds: unknown[] = [];
	if (opts.slugs) {
		if (opts.slugs.length === 0) return [];
		where.push(`h.reading_slug IN (${opts.slugs.map(() => '?').join(', ')})`);
		binds.push(...opts.slugs);
	}
	const limit = Math.max(1, Math.min(opts.limit ?? 200, 500));

	const shared = await db
		.prepare(
			`SELECT h.id, h.reading_slug, h.text, h.note, h.color, h.shared_at,
			        h.user_id, u.email, u.display_name
			 FROM highlights h JOIN users u ON u.id = h.user_id
			 WHERE ${where.join(' AND ')}
			 ORDER BY h.shared_at DESC, h.id DESC
			 LIMIT ${limit}`
		)
		.bind(...binds)
		.all<SharedRow>();
	const rows = shared.results ?? [];
	if (rows.length === 0) return [];

	const ids = rows.map((r) => r.id);
	const comments = await db
		.prepare(
			`SELECT c.id, c.highlight_id, c.user_id, c.body, c.created_at, u.email, u.display_name
			 FROM comments c JOIN users u ON u.id = c.user_id
			 WHERE c.highlight_id IN (${ids.map(() => '?').join(', ')})
			 ORDER BY c.created_at ASC, c.id ASC`
		)
		.bind(...ids)
		.all<CommentRow>();

	const byHighlight = new Map<number, CommonsComment[]>();
	for (const c of comments.results ?? []) {
		const list = byHighlight.get(c.highlight_id) ?? [];
		list.push({
			id: c.id,
			userId: c.user_id,
			author: nameFor(c.email, c.display_name),
			body: c.body,
			created_at: c.created_at
		});
		byHighlight.set(c.highlight_id, list);
	}

	return rows.map((r) => {
		const meta = readingMeta(r.reading_slug);
		return {
			id: r.id,
			slug: r.reading_slug,
			text: r.text,
			note: r.note,
			color: r.color,
			userId: r.user_id,
			author: nameFor(r.email, r.display_name),
			shared_at: r.shared_at,
			reading: {
				title: meta?.title ?? r.reading_slug,
				author: meta?.author ?? '',
				weekNumber: meta?.weekNumber ?? null,
				weekTitle: meta?.weekTitle ?? null
			},
			comments: byHighlight.get(r.id) ?? []
		};
	});
}

/** Number of shared highlights per reading slug, for badges and week cards. */
export async function countSharedBySlug(
	db: D1Database,
	slugs: string[]
): Promise<Map<string, number>> {
	const out = new Map<string, number>();
	if (slugs.length === 0) return out;
	const res = await db
		.prepare(
			`SELECT reading_slug, COUNT(*) AS n FROM highlights
			 WHERE shared_at IS NOT NULL AND reading_slug IN (${slugs.map(() => '?').join(', ')})
			 GROUP BY reading_slug`
		)
		.bind(...slugs)
		.all<{ reading_slug: string; n: number }>();
	for (const r of res.results ?? []) out.set(r.reading_slug, r.n);
	return out;
}
