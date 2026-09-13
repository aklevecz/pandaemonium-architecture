// Isolated regression tests: real SQLite queries, fake users, no network or email.
// Uses the Node 22.13+ SQLite API and Vite's existing esbuild dependency.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dir = await mkdtemp(resolve('node_modules/.notebook-tests-'));
after(() => rm(dir, { recursive: true, force: true }));
await build({
	entryPoints: {
		chat: 'src/routes/api/chat/+server.ts',
		notebook: 'src/routes/notebook/+page.server.ts',
		utils: 'src/lib/notebook.ts',
		markdown: 'src/lib/utils/chat-markdown.ts'
	},
	outdir: dir,
	outExtension: { '.js': '.mjs' },
	bundle: true,
	platform: 'node',
	format: 'esm',
	packages: 'external',
	alias: { $lib: resolve('src/lib') },
	plugins: [
		{
			name: 'test-app-environment',
			setup(builder) {
				builder.onResolve({ filter: /^\$app\/environment$/ }, () => ({
					path: 'environment',
					namespace: 'test'
				}));
				builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
					contents: 'export const dev = true; export const browser = false;'
				}));
			}
		}
	]
});
const moduleAt = (name) => import(pathToFileURL(`${dir}/${name}.mjs`).href);
const [chat, notebook, utils, markdown] = await Promise.all(
	['chat', 'notebook', 'utils', 'markdown'].map(moduleAt)
);
const migrations = await Promise.all(
	(await readdir('migrations'))
		.filter((f) => f.endsWith('.sql'))
		.sort()
		.map((f) => readFile(`migrations/${f}`, 'utf8'))
);

function fixture(t) {
	const sqlite = new DatabaseSync(':memory:');
	t.after(() => sqlite.close());
	for (const sql of migrations) sqlite.exec(sql);
	sqlite.exec(`
		INSERT INTO users (id, email, password_hash) VALUES (1, 'one@example.test', '!passwordless'), (2, 'two@example.test', '!passwordless');
		INSERT INTO conversations (id, user_id, reading_slug, title) VALUES (11, 1, 'alpha', 'Learning'), (22, 2, 'beta', 'Private conversation');
		INSERT INTO messages (conversation_id, role, content) VALUES (11, 'user', 'What is learning?'), (11, 'assistant', 'A rareword appears only in the reply.'), (22, 'user', 'PRIVATE MESSAGE');
		INSERT INTO notes (user_id, reading_slug, content) VALUES (1, 'alpha', 'Compare the rules'), (2, 'beta', 'PRIVATE NOTE');
		INSERT INTO highlights (user_id, reading_slug, text, note, color) VALUES (1, 'alpha', 'The apparatus defines the boundary.', 'Who chose it?', 'purple'), (2, 'beta', 'PRIVATE HIGHLIGHT', '', 'yellow');
		INSERT INTO vocab (user_id, reading_slug, word, definition, context) VALUES (1, 'beta', 'Apparatus', 'A arrangement of relations', 'A passage about the apparatus.'), (2, 'beta', 'PRIVATE WORD', 'PRIVATE DEFINITION', 'PRIVATE CONTEXT');
	`);
	const db = {
		prepare(sql) {
			const statement = sqlite.prepare(sql);
			return {
				bind(...params) {
					return {
						async first() {
							return statement.get(...params) ?? null;
						},
						async all() {
							return { results: statement.all(...params) };
						},
						async run() {
							const result = statement.run(...params);
							return {
								meta: {
									last_row_id: Number(result.lastInsertRowid),
									changes: Number(result.changes)
								}
							};
						}
					};
				}
			};
		}
	};
	const headers = {};
	function event({ method = 'GET', path = '/api/chat', body, userId = 1 } = {}) {
		return {
			url: new URL(path, 'https://course.example'),
			request: new Request(new URL(path, 'https://course.example'), {
				method,
				...(body
					? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
					: {})
			}),
			locals: { user: userId ? { id: userId, email: `${userId}@example.test` } : null },
			platform: { env: { DB: db, ANTHROPIC_API_KEY: 'fake-test-key' } },
			setHeaders(value) {
				Object.assign(headers, value);
			},
			fetch: async () =>
				Response.json({
					alpha: { title: 'Alpha reading', author: 'Writer One' },
					beta: { title: 'Beta reading', author: 'Writer Two' }
				})
		};
	}
	return { sqlite, db, event, headers };
}
const hasStatus = (status) => (err) => err.status === status;

test('chat history is private, including nonexistent and malformed conversation IDs', async (t) => {
	const { event } = fixture(t);
	const own = await chat.GET(event({ path: '/api/chat?id=11' }));
	assert.equal((await own.json()).length, 2);
	assert.equal(own.headers.get('Cache-Control'), 'private, no-store');
	for (const id of [22, 999])
		await assert.rejects(chat.GET(event({ path: `/api/chat?id=${id}` })), hasStatus(404));
	for (const id of ['', '0', '-1', '1.1', 'NaN', '9007199254740992'])
		await assert.rejects(chat.GET(event({ path: `/api/chat?id=${id}` })), hasStatus(400));
	await assert.rejects(chat.GET(event({ path: '/api/chat?id=11', userId: null })), hasStatus(401));
});

test('foreign or mismatched writes fail before messages, explain events, or upstream calls', async (t) => {
	const { sqlite, event } = fixture(t);
	let calls = 0;
	t.mock.method(globalThis, 'fetch', async () => {
		calls++;
		throw new Error('Unexpected network');
	});
	for (const [conversationId, slug] of [
		[22, 'beta'],
		[11, 'beta'],
		[999, 'alpha']
	]) {
		await assert.rejects(
			chat.POST(
				event({
					method: 'POST',
					body: {
						conversationId,
						slug,
						message: 'Injected message',
						selectedText: 'Injected selection'
					}
				})
			),
			hasStatus(404)
		);
	}
	assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM messages').get().n, 3);
	assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM explain_events').get().n, 0);
	assert.equal(calls, 0);
});

test('owners can continue and create conversations with streamed replies', async (t) => {
	const { sqlite, event } = fixture(t);
	t.mock.method(
		globalThis,
		'fetch',
		async () =>
			new Response(
				'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"A safe reply."}}\n\n'
			)
	);
	for (const conversationId of [11, null]) {
		const response = await chat.POST(
			event({
				method: 'POST',
				body: {
					conversationId,
					slug: 'alpha',
					message: 'Continue',
					readingTitle: 'Alpha',
					readingAuthor: 'Writer'
				}
			})
		);
		const events = (await response.text())
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		assert.equal(events[1].text, 'A safe reply.');
		assert.equal(events.at(-1).type, 'done');
	}
	assert.equal(
		sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE content = 'A safe reply.'").get().n,
		2
	);
	assert.equal(
		sqlite.prepare('SELECT COUNT(*) AS n FROM conversations WHERE user_id = 1').get().n,
		2
	);
});

test('renaming and deleting reject foreign conversations and preserve their messages', async (t) => {
	const { event, sqlite } = fixture(t);
	await assert.rejects(
		chat.PATCH(event({ method: 'PATCH', path: '/api/chat?id=22', body: { title: 'Changed' } })),
		hasStatus(404)
	);
	await assert.rejects(
		chat.DELETE(event({ method: 'DELETE', path: '/api/chat?id=22' })),
		hasStatus(404)
	);
	await chat.PATCH(
		event({ method: 'PATCH', path: '/api/chat?id=11', body: { title: 'My new title' } })
	);
	assert.equal(
		sqlite.prepare('SELECT title FROM conversations WHERE id = 11').get().title,
		'My new title'
	);
	await chat.DELETE(event({ method: 'DELETE', path: '/api/chat?id=11' }));
	assert.equal(
		sqlite.prepare('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = 11').get().n,
		0
	);
	assert.equal(
		sqlite.prepare('SELECT content FROM messages WHERE conversation_id = 22').get().content,
		'PRIVATE MESSAGE'
	);
});

test('notebook aggregates only the signed-in user’s material and requires login', async (t) => {
	const { event, headers } = fixture(t);
	const data = await notebook.load(event({ path: '/notebook' }));
	assert.equal(data.entries.length, 4);
	assert.equal(data.entries.find((e) => e.kind === 'conversation').messages.length, 2);
	assert.equal(headers['Cache-Control'], 'private, no-store');
	assert.doesNotMatch(JSON.stringify(data.entries), /PRIVATE/);
	assert.equal(data.readings.alpha.title, 'Alpha reading');
	await assert.rejects(notebook.load(event({ path: '/notebook', userId: null })), hasStatus(303));
});

test('notebook searches full conversations and combines type, reading, and author filters', async (t) => {
	const { event } = fixture(t);
	const { entries, readings } = await notebook.load(event());
	const filters = { query: 'RAREWORD', reading: '', kind: '', sort: 'newest' };
	assert.equal(utils.filterEntries(entries, readings, filters)[0].kind, 'conversation');
	assert.equal(utils.filterEntries(entries, readings, { ...filters, kind: 'note' }).length, 0);
	assert.equal(
		utils.filterEntries(entries, readings, {
			...filters,
			query: 'writer apparatus',
			reading: 'beta'
		})[0].kind,
		'vocab'
	);
	assert.equal(
		utils.filterEntries(entries, readings, { ...filters, query: 'Who chose' })[0].kind,
		'highlight'
	);
});

test('exports include complete conversations and source links, and filtered exports omit other work', async (t) => {
	const { event } = fixture(t);
	const { entries, readings } = await notebook.load(event());
	const conversation = entries.find((e) => e.kind === 'conversation');
	const output = utils.exportNotebook([conversation], readings, 'https://course.example');
	assert.match(output, /rareword/);
	assert.match(output, /https:\/\/course.example\/reading\/alpha\?conversation=11/);
	assert.doesNotMatch(output, /PRIVATE|Compare the rules|Who chose/);
	const highlight = entries.find((e) => e.kind === 'highlight');
	assert.equal(
		new URL(utils.entryHref(highlight), 'https://course.example').searchParams.get('q'),
		highlight.text
	);
	assert.doesNotMatch(
		utils.exportNotebook(
			[{ ...highlight, text: '<script>alert(1)</script>' }],
			readings,
			'https://course.example'
		),
		/<script>/
	);
});

test('chat Markdown preserves useful formatting while blocking executable markup and tracking images', () => {
	const safe = markdown.renderChatMarkdown(
		'**Bold** and [source](https://example.com)\n\n- one\n- two\n\n```html\n<script>example</script>\n```'
	);
	assert.match(safe, /<strong>Bold<\/strong>/);
	assert.match(safe, /href="https:\/\/example.com"/);
	assert.match(safe, /&lt;script&gt;example&lt;\/script&gt;/);
	for (const payload of [
		'<script>alert(1)</script><p onclick="alert(1)">text</p>',
		'<img src="https://example.com/track" onerror="alert(1)">',
		'<svg><a xlink:href="javascript:alert(1)">click</a></svg>',
		'<a href="jav&#x61;script:alert(1)">click</a>',
		'[click](javascript:alert%281%29)',
		'<iframe srcdoc="<script>alert(1)</script>"></iframe>',
		'<a style="color:red" href="data:text/html,evil">click</a>',
		'<form><input name="cookie"></form>',
		'<img src=x onerror="alert(1)'
	]) {
		const result = markdown.renderChatMarkdown(payload);
		assert.doesNotMatch(
			result,
			/<(script|img|svg|iframe|form|input)\b|<[^>]*\s(on\w+|style)=|href="(?:javascript|data):/i
		);
	}
});
