import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const slug = event.url.searchParams.get('slug');
	const conversationId = event.url.searchParams.get('id');

	if (conversationId) {
		const messages = await db
			.prepare('SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
			.bind(Number(conversationId))
			.all<{ id: number; role: string; content: string; created_at: string }>();
		return json(messages.results);
	}

	if (slug) {
		const conversations = await db
			.prepare('SELECT id, title, created_at FROM conversations WHERE user_id = ? AND reading_slug = ? ORDER BY created_at DESC')
			.bind(user.id, slug)
			.all<{ id: number; title: string; created_at: string }>();
		return json(conversations.results);
	}

	error(400, 'Missing slug or id');
};

// Streaming chat: client gets newline-delimited JSON events while Claude
// generates. Format:
//   {"type":"init","conversationId":N}      (always first)
//   {"type":"delta","text":"..."}           (zero or more)
//   {"type":"done"}                         (last on success)
//   {"type":"error","message":"..."}        (instead of done on failure)
// Whatever text was streamed before an error/disconnect is still persisted.
export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const apiKey = event.platform?.env?.ANTHROPIC_API_KEY;
	if (!apiKey) error(500, 'API key not configured');

	const { slug, conversationId, message, readingTitle, readingAuthor, selectedText } = await event.request.json();
	if (!slug || !message) error(400, 'Missing slug or message');
	const userId = user.id;

	let convId: number = conversationId;
	if (!convId) {
		const title = selectedText
			? selectedText.slice(0, 60) + (selectedText.length > 60 ? '...' : '')
			: message.slice(0, 60) + (message.length > 60 ? '...' : '');
		const result = await db
			.prepare('INSERT INTO conversations (user_id, reading_slug, title) VALUES (?, ?, ?)')
			.bind(userId, slug, title)
			.run();
		convId = Number(result.meta.last_row_id);
	}

	await db
		.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
		.bind(convId, 'user', message)
		.run();

	const history = await db
		.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
		.bind(convId)
		.all<{ role: string; content: string }>();

	// Split into a stable course-level prefix (cached across every chat in the
	// app) and a per-conversation suffix (re-sent each turn but tiny). Anthropic
	// prompt caching gives ~10x discount on the cached prefix and keeps the
	// system message reusable across conversations.
	const stableSystem = `You are a helpful reading assistant for an academic course called "Pandaemonium Architecture 6.0" which examines AI, machine learning, cybernetics, and their intersection with art and society. Help explain concepts, provide context, and engage in discussion about the reading. Be concise but thorough. Use accessible language while respecting the intellectual depth of the material.`;
	const conversationSystem = `The user is reading: "${readingTitle}" by ${readingAuthor}.${selectedText ? `\n\nThe user has selected this passage:\n"${selectedText}"` : ''}`;
	const systemBlocks = [
		{ type: 'text', text: stableSystem, cache_control: { type: 'ephemeral' } },
		{ type: 'text', text: conversationSystem }
	];

	const claudeMessages = (history.results ?? []).map((m: { role: string; content: string }) => ({
		role: m.role as 'user' | 'assistant',
		content: m.content
	}));

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
			let assistantText = '';

			send({ type: 'init', conversationId: convId });

			try {
				const upstream = await fetch('https://api.anthropic.com/v1/messages', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
						'anthropic-version': '2023-06-01'
					},
					body: JSON.stringify({
						model: 'claude-sonnet-4-20250514',
						max_tokens: 1024,
						stream: true,
						system: systemBlocks,
						messages: claudeMessages
					})
				});

				if (!upstream.ok || !upstream.body) {
					const errText = await upstream.text().catch(() => '');
					console.error('Claude API error:', errText);
					send({ type: 'error', message: 'Failed to get response from Claude' });
					return;
				}

				// Anthropic SSE format: lines of "event: <name>\n" + "data: <json>\n\n".
				// We only need the text from `content_block_delta` events.
				const reader = upstream.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';
				while (true) {
					const { value, done } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					let nlnl: number;
					while ((nlnl = buffer.indexOf('\n\n')) !== -1) {
						const block = buffer.slice(0, nlnl);
						buffer = buffer.slice(nlnl + 2);
						const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
						if (!dataLine) continue;
						const payload = dataLine.slice(6).trim();
						if (!payload || payload === '[DONE]') continue;
						try {
							const evt = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string } };
							if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
								assistantText += evt.delta.text;
								send({ type: 'delta', text: evt.delta.text });
							}
						} catch {
							// Ignore malformed lines; Anthropic also emits ping events etc.
						}
					}
				}

				send({ type: 'done' });
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Unknown error';
				console.error('Stream error:', msg);
				send({ type: 'error', message: msg });
			} finally {
				// Persist whatever we got, even on partial/error, so the client's
				// optimistic UI matches what's loaded back from D1 on refresh.
				if (assistantText.length) {
					try {
						await db
							.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
							.bind(convId, 'assistant', assistantText)
							.run();
					} catch (err) {
						console.error('Failed to persist assistant message:', err);
					}
				}
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'application/x-ndjson; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no'
		}
	});
};

export const DELETE: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const id = event.url.searchParams.get('id');
	if (!id) error(400, 'Missing id');

	await db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(Number(id)).run();
	await db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').bind(Number(id), user.id).run();
	return json({ ok: true });
};
