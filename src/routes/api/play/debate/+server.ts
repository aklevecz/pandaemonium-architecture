import { error } from '@sveltejs/kit';
import { requireAuthAndDb } from '$lib/server/api';
import { dataUrl } from '$lib/server/data-url';
import type { RequestHandler } from './$types';

interface PersonMention {
	readingSlug: string;
	chunkIndex: number;
	position: number;
	snippet: string;
	matchedAlias: string;
}
interface Person {
	slug: string;
	name: string;
	type: string;
	mentions: PersonMention[];
	wikipedia: { extract: string | null; birthYear: number | null; deathYear: number | null } | null;
	corpusContext: string | null;
}
interface Turn {
	role: 'user' | 'assistant';
	content: string;
}

const MODEL = 'claude-sonnet-4-6';
// 4096 ≈ 3000 words. A graduate-pitched 2-3 exchange runs ~600-1200 words;
// the headroom is for when Claude wants to quote from the corpus excerpts
// or develop a point at length. Cap is high enough that "cut off mid-
// paragraph" doesn't happen for normal turns.
const MAX_TOKENS = 4096;


function personContextBlock(p: Person, n = 4): string {
	const lines: string[] = [];
	const lifespan =
		p.wikipedia?.birthYear || p.wikipedia?.deathYear
			? ` (${p.wikipedia?.birthYear ?? '?'}–${p.wikipedia?.deathYear ?? ''})`
			: '';
	lines.push(`## ${p.name}${lifespan} — ${p.type}`);
	if (p.corpusContext) lines.push(`\nFraming in this course:\n${p.corpusContext}`);
	if (p.wikipedia?.extract) lines.push(`\nBackground:\n${p.wikipedia.extract}`);
	if (p.mentions.length) {
		lines.push(`\nVoice in the corpus (excerpts from where they appear):`);
		for (const m of p.mentions.slice(0, n)) {
			lines.push(`\n— ${m.snippet.slice(0, 350)}`);
		}
	}
	return lines.join('\n');
}

export const POST: RequestHandler = async (event) => {
	// Auth-gate so we don't bleed Sonnet spend on drive-by traffic, but no
	// per-user DB writes — debates aren't persisted (yet).
	requireAuthAndDb(event);
	const apiKey = event.platform?.env?.ANTHROPIC_API_KEY;
	if (!apiKey) error(500, 'API key not configured');

	const { thinkerASlug, thinkerBSlug, topic, history, isLast } = (await event.request.json()) as {
		thinkerASlug?: string;
		thinkerBSlug?: string;
		topic?: string;
		history?: Turn[];
		isLast?: boolean;
	};
	if (!thinkerASlug || !thinkerBSlug) error(400, 'Pick two thinkers');
	if (thinkerASlug === thinkerBSlug) error(400, 'Pick two different thinkers');

	const peopleRes = await event.fetch(dataUrl('/people.json', event.url.origin));
	if (!peopleRes.ok) error(503, 'People index not built');
	const peopleJson = (await peopleRes.json()) as { people: Person[] };
	const a = peopleJson.people.find((p) => p.slug === thinkerASlug);
	const b = peopleJson.people.find((p) => p.slug === thinkerBSlug);
	if (!a || !b) error(404, 'Thinker not found');

	const systemText = `You are staging a Diffraction Debate between two thinkers from the graduate seminar "Pandaemonium Architecture 6.0" (AI, machine learning, cybernetics, art, society). Each thinker speaks in their own voice, grounded in the corpus excerpts below. This is a simulation — careful reconstruction, not channeling — and you may say so when uncertain.

${personContextBlock(a)}

${personContextBlock(b)}

## How the debate runs

- Each utterance must be tagged: ${'`['}${a.name.toUpperCase()}${']`'} or ${'`['}${b.name.toUpperCase()}${']`'} at the start of its paragraph. Use exactly those tags.
- Each turn: 2–3 exchanges (so 4–6 tagged paragraphs total). Sometimes one speaker may take two paragraphs back-to-back if they're developing a point — that's allowed.
- Argue *with their concepts and vocabulary*, not generic philosophical positions. Concept-level disagreements matter more than affect-level ones.
- Quote from the excerpts when a quote actually sharpens the point. Don't fabricate quotes.
- Push tension where it's productive. Find the real point of disagreement, not the trivial framing one.
- If the student (the moderator) asks a question or interjects, both thinkers should respond in turn.
- Pitch the prose at graduate-seminar level. Assume the moderator can hold theoretical material.
- Don't break character to summarize their positions abstractly — show, don't tell.
- No "fade-outs", no narrator interludes, no "what do you think?" appeals — just the two thinkers, arguing.

${isLast ? `## THIS IS THE FINAL EXCHANGE
The student has set a turn budget and we're at the last one. Land it: each speaker takes their strongest closing position, names the irreducible disagreement that remains, and stops. No "to be continued", no opening of new threads. End on a real terminus — even if that terminus is an honest impasse.` : ''}`;

	const userOpening = topic
		? `Stage the opening exchange. The moderator has set the topic: ${topic}`
		: `Stage the opening exchange. Pick a point of real tension between these two and dive in.`;

	const messages: Turn[] = (history && history.length > 0)
		? history
		: [{ role: 'user', content: userOpening }];

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
						system: [
							{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }
						],
						messages
					})
				});
				if (!upstream.ok || !upstream.body) {
					const errText = await upstream.text().catch(() => '');
					console.error('debate upstream error:', upstream.status, errText);
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
				console.error('debate stream error:', err);
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
