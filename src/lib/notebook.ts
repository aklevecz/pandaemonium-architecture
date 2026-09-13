export type EntryKind = 'note' | 'highlight' | 'vocab' | 'conversation';
export const entryLabels: Record<EntryKind, string> = {
	note: 'Note',
	highlight: 'Highlight',
	vocab: 'Vocabulary',
	conversation: 'Conversation'
};
export interface NotebookMessage {
	role: 'user' | 'assistant';
	content: string;
	created_at: string;
}
export interface NotebookEntry {
	id: number;
	kind: EntryKind;
	slug: string;
	text: string;
	detail: string;
	context: string;
	color?: string;
	updated_at: string;
	messages?: NotebookMessage[];
}
export interface NotebookReading {
	title: string;
	author: string;
	weekNumber?: number;
}
export interface NotebookFilters {
	query: string;
	kind: string;
	reading: string;
	sort: string;
}

export function filterEntries(
	entries: NotebookEntry[],
	readings: Record<string, NotebookReading>,
	filters: NotebookFilters
) {
	const terms = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
	return entries
		.filter((entry) => {
			if (filters.kind && entry.kind !== filters.kind) return false;
			if (filters.reading && entry.slug !== filters.reading) return false;
			const meta = readings[entry.slug];
			const searchable = [
				entry.text,
				entry.detail,
				entry.context,
				meta?.title,
				meta?.author,
				...(entry.messages ?? []).map((m) => m.content)
			]
				.join(' ')
				.toLocaleLowerCase();
			return terms.every((term) => searchable.includes(term));
		})
		.sort((a, b) => {
			if (filters.sort === 'reading') {
				const readingOrder = (readings[a.slug]?.title ?? a.slug).localeCompare(
					readings[b.slug]?.title ?? b.slug
				);
				if (readingOrder) return readingOrder;
			}
			const dateOrder = b.updated_at.localeCompare(a.updated_at);
			return (
				(filters.sort === 'oldest' ? -dateOrder : dateOrder) ||
				a.kind.localeCompare(b.kind) ||
				b.id - a.id
			);
		});
}

export function entryHref(entry: NotebookEntry): string {
	const path = `/reading/${encodeURIComponent(entry.slug)}`;
	if (entry.kind === 'conversation') return `${path}?conversation=${entry.id}`;
	const passage = entry.kind === 'highlight' ? entry.text : entry.context;
	if (!passage) return path;
	return `${path}?q=${encodeURIComponent(passage.trim().split(/\s+/).slice(0, 12).join(' '))}`;
}

// Export user text literally: pasted HTML/Markdown must not become executable
// markup or replace the source links in a notebook opened in another reader.
function markdownText(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/([\\`*_{}\[\]()#+.!|~-])/g, '\\$1');
}

export function exportNotebook(
	entries: NotebookEntry[],
	readings: Record<string, NotebookReading>,
	origin: string
): string {
	const sections = entries.map((entry) => {
		const reading = readings[entry.slug] ?? { title: entry.slug, author: '' };
		const source = new URL(entryHref(entry), origin).href;
		const lines = [
			`## ${entryLabels[entry.kind]} · ${markdownText(reading.title)}`,
			`${markdownText(reading.author)}${reading.weekNumber ? ` · Week ${reading.weekNumber}` : ''}`,
			`Saved: ${entry.updated_at} UTC`,
			`[Open source](<${source}>)`,
			markdownText(entry.text)
		];
		if (entry.detail) lines.push(markdownText(entry.detail));
		if (entry.context)
			lines.push(
				'Context:',
				...markdownText(entry.context)
					.split('\n')
					.map((line) => `> ${line}`)
			);
		for (const message of entry.messages ?? []) {
			lines.push(
				`### ${message.role === 'user' ? 'You' : 'Assistant'}`,
				markdownText(message.content)
			);
		}
		return lines.filter(Boolean).join('\n\n');
	});
	return `# My notebook\n\nPandaemonium Architecture · ${entries.length} entries\n\n${sections.join('\n\n---\n\n')}\n`;
}
