import type { AuthedContext } from './api';
import type { NotebookEntry, NotebookMessage } from '$lib/notebook';

/** Every query is scoped to the authenticated user, including message joins. */
export async function loadNotebook(
	db: AuthedContext['db'],
	userId: number
): Promise<NotebookEntry[]> {
	const [notes, highlights, vocab, conversations, messages] = await Promise.all([
		db
			.prepare(
				'SELECT id, reading_slug AS slug, content AS text, updated_at FROM notes WHERE user_id = ?'
			)
			.bind(userId)
			.all<{ id: number; slug: string; text: string; updated_at: string }>(),
		db
			.prepare(
				'SELECT id, reading_slug AS slug, text, note AS detail, color, created_at AS updated_at FROM highlights WHERE user_id = ?'
			)
			.bind(userId)
			.all<{
				id: number;
				slug: string;
				text: string;
				detail: string;
				color: string;
				updated_at: string;
			}>(),
		db
			.prepare(
				'SELECT id, reading_slug AS slug, word AS text, definition AS detail, context, created_at AS updated_at FROM vocab WHERE user_id = ?'
			)
			.bind(userId)
			.all<{
				id: number;
				slug: string;
				text: string;
				detail: string;
				context: string | null;
				updated_at: string;
			}>(),
		db
			.prepare(
				'SELECT id, reading_slug AS slug, title AS text, created_at AS updated_at FROM conversations WHERE user_id = ?'
			)
			.bind(userId)
			.all<{ id: number; slug: string; text: string; updated_at: string }>(),
		db
			.prepare(
				`SELECT m.conversation_id, m.role, m.content, m.created_at FROM messages m
			JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = ? ORDER BY m.created_at ASC, m.id ASC`
			)
			.bind(userId)
			.all<NotebookMessage & { conversation_id: number }>()
	]);
	const byConversation = new Map<number, NotebookMessage[]>();
	for (const { conversation_id, ...message } of messages.results) {
		const list = byConversation.get(conversation_id) ?? [];
		list.push(message);
		byConversation.set(conversation_id, list);
	}
	return [
		...notes.results.map(
			(row): NotebookEntry => ({ ...row, kind: 'note', detail: '', context: '' })
		),
		...highlights.results.map(
			(row): NotebookEntry => ({ ...row, kind: 'highlight', detail: row.detail ?? '', context: '' })
		),
		...vocab.results.map(
			(row): NotebookEntry => ({ ...row, kind: 'vocab', context: row.context ?? '' })
		),
		...conversations.results.map((row): NotebookEntry => {
			const thread = byConversation.get(row.id) ?? [];
			return {
				...row,
				text: row.text || 'Untitled conversation',
				kind: 'conversation',
				detail: '',
				context: '',
				messages: thread,
				updated_at: thread.at(-1)?.created_at ?? row.updated_at
			};
		})
	];
}
