import { json, error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import type { RequestHandler } from './$types';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 220;

// Defines a word/phrase as it's used in a specific passage from a course
// reading, then auto-saves the entry to the user's vocab list. The contextual
// meaning matters more than dictionary glossing for these texts (Tiqqun's
// "circumverse", Barad's "agential cut" etc. don't appear in any dictionary).
//
// POST /api/define { slug, word, context, readingTitle?, readingAuthor? }
// returns { word, definition }
export const POST: RequestHandler = async (event) => {
	const { user, db } = requireAuthAndDb(event);
	const apiKey = event.platform?.env?.ANTHROPIC_API_KEY;
	if (!apiKey) error(500, 'API key not configured');

	const { slug, word, context, readingTitle, readingAuthor } = await event.request.json();
	if (!slug || !word) error(400, 'Missing slug or word');
	const trimmedWord = String(word).trim();
	if (trimmedWord.length === 0) error(400, 'Empty word');
	if (trimmedWord.length > 200) error(400, 'Selection too long for definition (use Explain instead)');

	const systemPrompt = `You are defining vocabulary for a student reading the academic text "${readingTitle ?? ''}"${readingAuthor ? ` by ${readingAuthor}` : ''} as part of a course on AI, machine learning, cybernetics, art, and society.

Return ONE plain-prose paragraph (50-90 words) that defines the term as it functions in the surrounding passage. Skip the dictionary stuff if the term is technical or coined; explain what the author means by it. Don't repeat the term back as the first word. No headings, no bullet points, no quoted prose. Just the definition.`;

	const userMessage = context
		? `Define "${trimmedWord}" as used in this passage:\n\n${String(context).slice(0, 1500)}`
		: `Define "${trimmedWord}".`;

	let definition: string;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: MODEL,
				max_tokens: MAX_TOKENS,
				system: systemPrompt,
				messages: [{ role: 'user', content: userMessage }]
			})
		});
		if (!res.ok) {
			const errText = await res.text().catch(() => '');
			console.error('define API error:', res.status, errText);
			error(502, 'Failed to fetch definition');
		}
		const json = (await res.json()) as { content?: Array<{ text?: string }> };
		definition = json.content?.[0]?.text?.trim() ?? '';
		if (!definition) error(502, 'Empty definition returned');
	} catch (err) {
		if (err instanceof Error && err.message.startsWith('Failed to')) throw err;
		console.error('define call threw:', err);
		error(502, 'Definition lookup failed');
	}

	// Upsert: same word looked up twice in the same reading → latest wins,
	// keep the new context too.
	try {
		await db
			.prepare(
				`INSERT INTO vocab (user_id, reading_slug, word, definition, context)
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT (user_id, reading_slug, word)
				 DO UPDATE SET definition = excluded.definition,
				               context = excluded.context,
				               created_at = datetime('now')`
			)
			.bind(user.id, slug, trimmedWord, definition, context ?? null)
			.run();
	} catch (err) {
		// Persisting is best-effort — don't block the user from seeing the
		// definition if the DB write hiccups.
		console.error('vocab persist failed:', err);
	}

	return json({ word: trimmedWord, definition });
};
