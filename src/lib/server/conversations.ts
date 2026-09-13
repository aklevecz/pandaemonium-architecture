import { error } from '@sveltejs/kit';
import type { AuthedContext } from './api';

export function conversationId(value: unknown): number {
	if (
		(typeof value !== 'string' && typeof value !== 'number') ||
		!/^[1-9]\d*$/.test(String(value))
	) {
		error(400, 'Invalid conversation id');
	}
	const id = Number(value);
	if (!Number.isSafeInteger(id)) error(400, 'Invalid conversation id');
	return id;
}

/** Check before any history access, write, event logging, or model request. */
export async function requireConversation(
	db: AuthedContext['db'],
	userId: number,
	value: unknown,
	slug?: string
) {
	const id = conversationId(value);
	const row = await db
		.prepare('SELECT id, reading_slug FROM conversations WHERE id = ? AND user_id = ?')
		.bind(id, userId)
		.first<{ id: number; reading_slug: string }>();
	if (!row || (slug !== undefined && row.reading_slug !== slug))
		error(404, 'Conversation not found');
	return row;
}
