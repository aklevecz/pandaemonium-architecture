// Commons regression tests: real SQLite queries, fake users, no network.
// Covers the privacy boundary (private highlights never surface), the share
// toggle, comment placement rules, and comment ownership on delete.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dir = await mkdtemp(resolve('node_modules/.commons-tests-'));
after(() => rm(dir, { recursive: true, force: true }));
await build({
	entryPoints: {
		commons: 'src/lib/server/commons.ts',
		highlights: 'src/routes/api/highlights/+server.ts',
		comments: 'src/routes/api/comments/+server.ts',
		profile: 'src/routes/api/profile/+server.ts',
		page: 'src/routes/commons/+page.server.ts'
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
const [commons, highlightsApi, commentsApi, profileApi, pageLoad] = await Promise.all(
	['commons', 'highlights', 'comments', 'profile', 'page'].map(moduleAt)
);
const migrations = await Promise.all(
	(await readdir('migrations'))
		.filter((f) => f.endsWith('.sql'))
		.sort()
		.map((f) => readFile(`migrations/${f}`, 'utf8'))
);

// Two readings from the real syllabus so week filtering has something to bite
// on: the first week-1 primary reading and the first week-2 primary reading.
const week1 = commons.slugsForWeek(1)[0];
const week2 = commons.slugsForWeek(2)[0];
assert.ok(week1 && week2, 'syllabus has readings in weeks 1 and 2');

function fixture(t) {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON');
	t.after(() => sqlite.close());
	for (const sql of migrations) sqlite.exec(sql);
	sqlite.exec(`
		INSERT INTO users (id, email, password_hash, display_name) VALUES
			(1, 'one@example.test', '!passwordless', 'Ada'),
			(2, 'two@example.test', '!passwordless', NULL),
			(3, 'teach@example.test', '!passwordless', 'Prof');
		UPDATE users SET is_admin = 1 WHERE id = 3;
		INSERT INTO highlights (id, user_id, reading_slug, text, note, color, shared_at) VALUES
			(10, 1, '${week1}', 'A shared passage.', 'Why this?', 'yellow', '2026-09-01 10:00:00'),
			(11, 1, '${week1}', 'PRIVATE PASSAGE', '', 'yellow', NULL),
			(12, 2, '${week2}', 'Another shared one.', '', 'pink', '2026-09-02 10:00:00');
		INSERT INTO comments (highlight_id, user_id, body) VALUES (10, 2, 'Good question.');
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
	return { sqlite, db };
}

const users = {
	1: { id: 1, email: 'one@example.test', isAdmin: false, displayName: 'Ada' },
	2: { id: 2, email: 'two@example.test', isAdmin: false, displayName: null },
	3: { id: 3, email: 'teach@example.test', isAdmin: true, displayName: 'Prof' }
};
function event(db, userId, { body, search } = {}) {
	return {
		locals: { user: users[userId] ?? null },
		platform: { env: { DB: db } },
		url: new URL(`http://test/x${search ?? ''}`),
		request: new Request('http://test/x', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body ?? {})
		})
	};
}
async function status(promise) {
	try {
		const res = await promise;
		return res.status;
	} catch (err) {
		return err?.status ?? err;
	}
}

test('private highlights never enter the feed, shared ones carry names and comments', async (t) => {
	const { db } = fixture(t);
	const feed = await commons.loadCommons(db);
	assert.deepEqual(
		feed.map((e) => e.id),
		[12, 10],
		'newest share first'
	);
	assert.ok(!JSON.stringify(feed).includes('PRIVATE'), 'private text leaks nowhere');
	const first = feed.find((e) => e.id === 10);
	assert.equal(first.author, 'Ada');
	assert.equal(first.reading.weekNumber, 1);
	assert.equal(first.comments.length, 1);
	assert.equal(
		first.comments[0].author,
		'two',
		'no display name falls back to the email local part'
	);
});

test("week filter keeps only that week's readings", async (t) => {
	const { db } = fixture(t);
	const w1 = await commons.loadCommons(db, { slugs: commons.slugsForWeek(1) });
	assert.deepEqual(
		w1.map((e) => e.id),
		[10]
	);
	const none = await commons.loadCommons(db, { slugs: [] });
	assert.deepEqual(none, []);
});

test('share toggle sets and clears shared_at, and only for the owner', async (t) => {
	const { db, sqlite } = fixture(t);
	const shared = () =>
		sqlite.prepare('SELECT shared_at FROM highlights WHERE id = 11').get().shared_at;

	assert.equal(
		(await highlightsApi.PUT(event(db, 1, { body: { id: 11, shared: true } }))).status,
		200
	);
	assert.ok(shared(), 'owner can share');
	const stamp = shared();
	await highlightsApi.PUT(event(db, 1, { body: { id: 11, shared: true } }));
	assert.equal(shared(), stamp, 'sharing again keeps the original timestamp');

	await highlightsApi.PUT(event(db, 2, { body: { id: 11, shared: false } }));
	assert.ok(shared(), 'someone else cannot unshare it');

	await highlightsApi.PUT(event(db, 1, { body: { id: 11, shared: false } }));
	assert.equal(shared(), null, 'owner can withdraw it');

	const own = await (await highlightsApi.GET(event(db, 1, { search: `?slug=${week1}` }))).json();
	assert.ok(
		own.every((h) => 'shared_at' in h),
		'the reader learns which highlights are shared'
	);
});

test('comments land only on shared highlights and delete by ownership', async (t) => {
	const { db, sqlite } = fixture(t);
	assert.equal(
		await status(commentsApi.POST(event(db, 2, { body: { highlightId: 11, body: 'hi' } }))),
		404
	);
	assert.equal(
		await status(commentsApi.POST(event(db, 2, { body: { highlightId: 999, body: 'hi' } }))),
		404
	);
	assert.equal(
		await status(commentsApi.POST(event(db, 2, { body: { highlightId: 10, body: '   ' } }))),
		400
	);
	assert.equal(
		await status(commentsApi.POST(event(db, null, { body: { highlightId: 10, body: 'hi' } }))),
		401
	);

	const posted = await (
		await commentsApi.POST(event(db, 2, { body: { highlightId: 10, body: 'Me too.' } }))
	).json();
	assert.equal(posted.author, 'two');
	const count = () => sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get().n;
	assert.equal(count(), 2);

	assert.equal(
		await status(commentsApi.DELETE(event(db, 1, { search: `?id=${posted.id}` }))),
		404,
		'not yours'
	);
	assert.equal(count(), 2);
	assert.equal(
		await status(commentsApi.DELETE(event(db, 3, { search: `?id=${posted.id}` }))),
		200,
		'instructor may'
	);
	assert.equal(count(), 1);
	assert.equal(
		await status(commentsApi.DELETE(event(db, 2, { search: '?id=1' }))),
		200,
		'own comment'
	);
	assert.equal(count(), 0);
});

test('unsharing hides the thread; deleting the highlight removes it', async (t) => {
	const { db, sqlite } = fixture(t);
	await highlightsApi.PUT(event(db, 1, { body: { id: 10, shared: false } }));
	const feed = await commons.loadCommons(db);
	assert.deepEqual(
		feed.map((e) => e.id),
		[12]
	);
	assert.equal(
		sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get().n,
		1,
		'comments survive unsharing'
	);

	await highlightsApi.DELETE(event(db, 1, { search: '?id=10' }));
	assert.equal(
		sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get().n,
		0,
		'cascade on delete'
	);
});

test('display names are trimmed, bounded, and shown back', async (t) => {
	const { db, sqlite } = fixture(t);
	assert.equal(await status(profileApi.PUT(event(db, 2, { body: { displayName: '   ' } }))), 400);
	assert.equal(
		await status(profileApi.PUT(event(db, 2, { body: { displayName: 'x'.repeat(41) } }))),
		400
	);
	const saved = await (
		await profileApi.PUT(event(db, 2, { body: { displayName: '  Grace   Hopper ' } }))
	).json();
	assert.equal(saved.displayName, 'Grace Hopper');
	assert.equal(
		sqlite.prepare('SELECT display_name FROM users WHERE id = 2').get().display_name,
		'Grace Hopper'
	);
});

test('the commons page requires a sign-in and reports the viewer', async (t) => {
	const { db } = fixture(t);
	await assert.rejects(
		pageLoad.load({
			locals: { user: null },
			platform: { env: { DB: db } },
			url: new URL('http://test/commons?week=1')
		}),
		(err) => err?.status === 303 && err.location.includes('next=%2Fcommons%3Fweek%3D1')
	);
	const data = await pageLoad.load({
		locals: { user: users[2] },
		platform: { env: { DB: db } },
		url: new URL('http://test/commons')
	});
	assert.equal(data.viewer.name, 'two');
	assert.equal(data.viewer.hasName, false);
	assert.deepEqual(data.weeksWithShares, [1, 2]);
	const filtered = await pageLoad.load({
		locals: { user: users[1] },
		platform: { env: { DB: db } },
		url: new URL('http://test/commons?week=2')
	});
	assert.deepEqual(
		filtered.entries.map((e) => e.id),
		[12]
	);
	assert.deepEqual(filtered.weeksWithShares, [1, 2], 'chips stay complete under a filter');
});
