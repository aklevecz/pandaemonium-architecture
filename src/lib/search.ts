// Client-side search across the 72 course readings. Fetches each reading
// markdown from /reading-content/<slug>.md (already served as a static asset),
// caches the corpus in sessionStorage so subsequent searches are instant, and
// returns ranked snippet matches.
//
// We intentionally don't pre-build an index at build time. Naive indexOf
// across ~5 MB of text takes <100ms in modern browsers and the indexing cost
// at build time would couple every reading content change to a re-deploy.

import { weeks, introductoryReadings, type Reading } from './data/syllabus';
import { slugify } from './utils/slug';

export interface ReadingMeta {
	slug: string;
	title: string;
	author: string;
	weekNumber?: number;
	weekTitle?: string;
	isAdditional: boolean;
	isIntroductory: boolean;
}

export interface SearchHit {
	meta: ReadingMeta;
	matches: number;
	snippets: { before: string; match: string; after: string; index: number }[];
}

const CACHE_KEY = 'reading-corpus-v1';
const SNIPPET_RADIUS = 80; // chars on each side of the match
const MAX_SNIPPETS_PER_READING = 3;

let memoryCache: Record<string, string> | null = null;

export function buildReadingMetaList(): ReadingMeta[] {
	const out: ReadingMeta[] = [];
	for (const r of introductoryReadings) {
		out.push({
			slug: slugify(r.pdf),
			title: r.title,
			author: r.author,
			isAdditional: false,
			isIntroductory: true
		});
	}
	for (const week of weeks) {
		for (const r of week.readings) {
			out.push({
				slug: slugify(r.pdf),
				title: r.title,
				author: r.author,
				weekNumber: week.number,
				weekTitle: week.title,
				isAdditional: false,
				isIntroductory: false
			});
		}
		for (const r of week.additionalReadings) {
			out.push({
				slug: slugify(r.pdf),
				title: r.title,
				author: r.author,
				weekNumber: week.number,
				weekTitle: week.title,
				isAdditional: true,
				isIntroductory: false
			});
		}
	}
	return out;
}

function loadCacheFromStorage(): Record<string, string> | null {
	try {
		const raw = sessionStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function saveCacheToStorage(corpus: Record<string, string>) {
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify(corpus));
	} catch {
		// sessionStorage quota varies (5–10MB typical). On overflow the
		// in-memory cache still works for this session; we just lose the
		// cross-navigation savings.
	}
}

// Strip markdown formatting characters so search hits show clean prose
// rather than `**bold**` or `[link](url)` noise.
function stripMarkdown(md: string): string {
	return md
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → just text
		.replace(/[*_`#>~]+/g, '') // emphasis / heading / quote markers
		.replace(/\n+/g, ' ') // newlines → spaces
		.replace(/\s+/g, ' '); // collapse whitespace
}

export async function loadCorpus(metaList: ReadingMeta[]): Promise<Record<string, string>> {
	if (memoryCache) return memoryCache;
	const cached = loadCacheFromStorage();
	if (cached) {
		memoryCache = cached;
		return cached;
	}
	const corpus: Record<string, string> = {};
	// HTTP/2 multiplexes; browsers fire these in parallel. Each ~70 KB gz'd
	// file resolves quickly, total wall time on broadband is ~1–2 s.
	const results = await Promise.all(
		metaList.map(async (m) => {
			try {
				const res = await fetch(`/reading-content/${m.slug}.md`);
				if (!res.ok) return [m.slug, ''] as const;
				const text = await res.text();
				return [m.slug, stripMarkdown(text)] as const;
			} catch {
				return [m.slug, ''] as const;
			}
		})
	);
	for (const [slug, text] of results) corpus[slug] = text;
	memoryCache = corpus;
	saveCacheToStorage(corpus);
	return corpus;
}

export function search(
	query: string,
	corpus: Record<string, string>,
	metaList: ReadingMeta[]
): SearchHit[] {
	const q = query.trim();
	if (q.length < 2) return [];
	const needle = q.toLowerCase();
	const hits: SearchHit[] = [];

	for (const meta of metaList) {
		const haystack = corpus[meta.slug];
		if (!haystack) continue;
		const lower = haystack.toLowerCase();

		const indices: number[] = [];
		let from = 0;
		while (true) {
			const i = lower.indexOf(needle, from);
			if (i === -1) break;
			indices.push(i);
			from = i + needle.length;
			if (indices.length > 200) break; // sanity cap on a query that matches everywhere
		}
		if (indices.length === 0) {
			// Also match in title or author — useful for queries like "Barad"
			// when the term doesn't appear in the chapter body.
			if (
				meta.title.toLowerCase().includes(needle) ||
				meta.author.toLowerCase().includes(needle)
			) {
				hits.push({ meta, matches: 0, snippets: [] });
			}
			continue;
		}

		const snippets = indices.slice(0, MAX_SNIPPETS_PER_READING).map((i) => {
			const start = Math.max(0, i - SNIPPET_RADIUS);
			const end = Math.min(haystack.length, i + needle.length + SNIPPET_RADIUS);
			return {
				before: (start > 0 ? '…' : '') + haystack.slice(start, i),
				match: haystack.slice(i, i + needle.length),
				after: haystack.slice(i + needle.length, end) + (end < haystack.length ? '…' : ''),
				index: i
			};
		});
		hits.push({ meta, matches: indices.length, snippets });
	}

	// Rank: most matches first; title/author-only matches (matches=0) sink to bottom.
	hits.sort((a, b) => b.matches - a.matches);
	return hits;
}
