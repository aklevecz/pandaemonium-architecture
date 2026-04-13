import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const slug = url.searchParams.get('slug');
	const conversationId = url.searchParams.get('id');

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
			.bind(locals.user.id, slug)
			.all<{ id: number; title: string; created_at: string }>();
		return json(conversations.results);
	}

	error(400, 'Missing slug or id');
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');
	const apiKey = platform?.env?.ANTHROPIC_API_KEY;
	if (!apiKey) error(500, 'API key not configured');

	const { slug, conversationId, message, readingTitle, readingAuthor, selectedText } = await request.json();
	if (!slug || !message) error(400, 'Missing slug or message');

	let convId = conversationId;

	// Create new conversation if needed
	if (!convId) {
		const title = selectedText
			? selectedText.slice(0, 60) + (selectedText.length > 60 ? '...' : '')
			: message.slice(0, 60) + (message.length > 60 ? '...' : '');
		const result = await db
			.prepare('INSERT INTO conversations (user_id, reading_slug, title) VALUES (?, ?, ?)')
			.bind(locals.user.id, slug, title)
			.run();
		convId = result.meta.last_row_id;
	}

	// Save user message
	await db
		.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
		.bind(convId, 'user', message)
		.run();

	// Get conversation history
	const history = await db
		.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
		.bind(convId)
		.all<{ role: string; content: string }>();

	// Build Claude messages
	const systemPrompt = `You are a helpful reading assistant for an academic course called "Pandaemonium Architecture 6.0" which examines AI, machine learning, cybernetics, and their intersection with art and society.

The user is reading: "${readingTitle}" by ${readingAuthor}.
${selectedText ? `\nThe user has selected this passage:\n"${selectedText}"\n` : ''}
Help explain concepts, provide context, and engage in discussion about the reading. Be concise but thorough. Use accessible language while respecting the intellectual depth of the material.`;

	const claudeMessages = history.results.map((m) => ({
		role: m.role as 'user' | 'assistant',
		content: m.content
	}));

	// Call Claude API
	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 1024,
			system: systemPrompt,
			messages: claudeMessages
		})
	});

	if (!response.ok) {
		const err = await response.text();
		console.error('Claude API error:', err);
		error(502, 'Failed to get response from Claude');
	}

	const result = await response.json() as { content: Array<{ text: string }> };
	const assistantMessage = result.content[0].text;

	// Save assistant message
	await db
		.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
		.bind(convId, 'assistant', assistantMessage)
		.run();

	return json({
		conversationId: convId,
		message: assistantMessage
	});
};

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(500, 'Database not available');

	const id = url.searchParams.get('id');
	if (!id) error(400, 'Missing id');

	await db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(Number(id)).run();
	await db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').bind(Number(id), locals.user.id).run();

	return json({ ok: true });
};
