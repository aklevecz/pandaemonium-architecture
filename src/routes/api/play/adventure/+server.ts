import { error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { dataUrl } from '$lib/server/data-url';
import type { RequestHandler } from './$types';

interface Summary {
	tldr?: string;
	thesis?: string;
	keyTerms?: { term: string; gloss: string }[];
	outline?: string[];
	representativePassages?: { text: string; why: string }[];
}
interface Turn { role: 'user' | 'assistant'; content: string }

const MODEL = 'claude-sonnet-4-6';
// Scenes are 80-160 words + a few choices, so 900 was usually enough — but
// any sentence the model wants to develop past that gets clipped. 2048
// gives comfortable headroom without inviting bloat.
const MAX_TOKENS = 2048;


export const POST: RequestHandler = async (event) => {
	requireAuthAndDb(event);
	const apiKey = event.platform?.env?.ANTHROPIC_API_KEY;
	if (!apiKey) error(500, 'API key not configured');

	const { readingSlug, history, readingTitle, readingAuthor } = (await event.request.json()) as {
		readingSlug?: string;
		readingTitle?: string;
		readingAuthor?: string;
		history?: Turn[];
	};
	if (!readingSlug) error(400, 'Missing readingSlug');

	const sumRes = await event.fetch(dataUrl(`/summaries/${readingSlug}.json`, event.url.origin));
	if (!sumRes.ok) error(503, 'Summary not built for this reading');
	const summary = (await sumRes.json()) as Summary;

	const system = `You are running an interactive adventure for a graduate student exploring "${readingTitle}"${readingAuthor ? ` by ${readingAuthor}` : ''}. Your role is part dungeon master, part theorist's ghost. The reading IS the world. The student steps into a scenario that lives in the reading's domain (or in the world the reading critiques) and learns the text's concepts by inhabiting them, not by being lectured.

THE READING

TL;DR: ${summary.tldr ?? '(none)'}
Thesis: ${summary.thesis ?? '(none)'}
Key terms${summary.keyTerms?.length ? ':' : ': (none)'}
${(summary.keyTerms ?? []).map((k) => `- ${k.term}: ${k.gloss}`).join('\n')}
Outline${summary.outline?.length ? ':' : ': (none)'}
${(summary.outline ?? []).map((s) => `- ${s}`).join('\n')}
Representative passages${summary.representativePassages?.length ? ':' : ': (none)'}
${(summary.representativePassages ?? []).map((p) => `“${p.text}” — ${p.why}`).join('\n\n')}

HOW SCENES WORK

Each turn you write ONE scene + a small handful of choices.

- Scene: 80–160 words of vivid, specific prose. Set in the reading's world or its critiqued world. Sensory, scene-set, present tense. Don't summarize the reading — drop the student INTO it.
- After the scene, output exactly the line: ---
- Then 2 or 3 numbered choices, each one short imperative or a posture the student can take. Each choice should lead toward a different concept from the reading.
- When a choice can be grounded in an actual key term or quoted passage, weave it into the scene's language so the student is encountering the concept, not labeling it.
- After about 6 scenes (or when the student's path has traversed the central tensions), end the adventure: emit a final scene followed by "---" then a single line "[END]" then a 2-3 sentence synthesis paragraph naming what concepts they traversed and (when possible) pointing them back to the representative passages.
- No quiz questions, no "did you understand" beats, no narrator winks. The student is making meaning, not being tested.
- Pitch the prose at graduate-seminar level. Don't dumb anything down.

HISTORY

You'll receive prior scenes + the student's chosen action as a normal conversation. Continue the adventure from where it left off.`;

	const messages: Turn[] =
		history && history.length > 0
			? history
			: [
					{
						role: 'user',
						content:
			'Begin the adventure. Open with the first scene that throws me into the world of this reading.'
					}
				];

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
			try {
				const upstream = await fetch('https://api.anthropic.com/v1/messages', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
						'anthropic-version': '2023-06-01',
						'anthropic-beta': 'prompt-caching-2024-07-31'
					},
					body: JSON.stringify({
						model: MODEL,
						max_tokens: MAX_TOKENS,
						stream: true,
						system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
						messages
					})
				});
				if (!upstream.ok || !upstream.body) {
					const errText = await upstream.text().catch(() => '');
					console.error('adventure upstream error:', upstream.status, errText);
					send({ type: 'error', message: 'Upstream call failed' });
					controller.close();
					return;
				}
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
							const evt = JSON.parse(payload) as {
								type?: string;
								delta?: { type?: string; text?: string };
							};
							if (
								evt.type === 'content_block_delta' &&
								evt.delta?.type === 'text_delta' &&
								evt.delta.text
							) {
								send({ type: 'delta', text: evt.delta.text });
							}
						} catch {}
					}
				}
				send({ type: 'done' });
			} catch (err) {
				console.error('adventure stream error:', err);
				send({ type: 'error', message: err instanceof Error ? err.message : 'unknown' });
			} finally {
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
