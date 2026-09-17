// Lab desk regression tests: real SQLite, fake users, a recording email binding.
// Covers who can see the contact address, meeting request ownership and
// limits, instructor-only answers, and what the Fuser sheet shows to whom.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dir = await mkdtemp(resolve('node_modules/.lab-desk-tests-'));
after(() => rm(dir, { recursive: true, force: true }));
await build({
	entryPoints: {
		meetings: 'src/routes/api/lab/meetings/+server.ts',
		fuser: 'src/routes/api/lab/fuser/+server.ts',
		page: 'src/routes/lab/+page.server.ts'
	},
	outdir: dir,
	outExtension: { '.js': '.mjs' },
	bundle: true,
	platform: 'node',
	format: 'esm',
	packages: 'external',
	alias: { $lib: resolve('src/lib') },
	loader: { '.md': 'text' },
	plugins: [
		{
			name: 'test-shims',
			setup(builder) {
				builder.onResolve({ filter: /^\$app\/environment$/ }, () => ({
					path: 'environment',
					namespace: 'test'
				}));
				builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
					contents: 'export const dev = false; export const browser = false;'
				}));
				// The lab index loads decks through Vite's import.meta.glob, which
				// esbuild doesn't have. The desk doesn't depend on the decks.
				builder.onLoad({ filter: /src\/lib\/server\/labs\.ts$/ }, () => ({
					contents:
						'export const allLabs = []; export const visibleLabs = () => []; export const getVisibleLab = () => undefined; export const isLabVisible = () => true;'
				}));
			}
		}
	]
});
const moduleAt = (name) => import(pathToFileURL(`${dir}/${name}.mjs`).href);
const [meetings, fuser, page] = await Promise.all(['meetings', 'fuser', 'page'].map(moduleAt));
const migrations = await Promise.all(
	(await readdir('migrations'))
		.filter((f) => f.endsWith('.sql'))
		.sort()
		.map((f) => readFile(`migrations/${f}`, 'utf8'))
);

const CONTACT = 'arielklevecz@students.calarts.edu';

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
	const sent = [];
	const pending = [];
	const platform = {
		env: {
			DB: db,
			EMAIL: {
				async send(message) {
					sent.push(message);
					return {};
				}
			}
		},
		context: { waitUntil: (p) => pending.push(p) }
	};
	return { sqlite, db, platform, sent, settle: () => Promise.all(pending) };
}

const users = {
	1: { id: 1, email: 'one@example.test', isAdmin: false, displayName: 'Ada' },
	2: { id: 2, email: 'two@example.test', isAdmin: false, displayName: null },
	3: { id: 3, email: 'teach@example.test', isAdmin: true, displayName: 'Prof' }
};
function event(platform, userId, { body, search } = {}) {
	return {
		locals: { user: users[userId] ?? null },
		platform,
		url: new URL(`http://test/lab${search ?? ''}`),
		request: new Request('http://test/x', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body ?? {})
		})
	};
}
async function status(promise) {
	try {
		return (await promise).status;
	} catch (err) {
		return err?.status ?? err;
	}
}

test('the contact address reaches signed-in viewers only', async (t) => {
	const { platform } = fixture(t);
	const out = await page.load({ locals: { user: null }, platform });
	assert.equal(out.desk, null);
	assert.ok(!JSON.stringify(out).includes(CONTACT), 'no address in signed-out data');

	const signedIn = await page.load({ locals: { user: users[1] }, platform });
	assert.equal(signedIn.desk.contact.email, CONTACT);
	assert.equal(signedIn.desk.isInstructor, false);
	assert.equal(signedIn.desk.allMeetings, null, 'students never get the full request list');
});

test('a meeting request is saved, emailed to the instructor, and private to its author', async (t) => {
	const { platform, sent, settle } = fixture(t);
	assert.equal(await status(meetings.POST(event(platform, null, { body: { topic: 'x' } }))), 401);
	assert.equal(await status(meetings.POST(event(platform, 1, { body: { topic: '   ' } }))), 400);
	assert.equal(
		await status(meetings.POST(event(platform, 1, { body: { topic: 'x'.repeat(601) } }))),
		400
	);

	const res = await meetings.POST(
		event(platform, 1, { body: { topic: 'My final project', availability: 'Tue after 2' } })
	);
	assert.equal(res.status, 200);
	await settle();
	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, CONTACT);
	assert.equal(sent[0].replyTo, 'one@example.test', 'replying reaches the student');
	assert.match(sent[0].text, /My final project/);
	assert.match(sent[0].text, /Tue after 2/);

	const mine = await page.load({ locals: { user: users[1] }, platform });
	assert.equal(mine.desk.myMeetings.length, 1);
	const theirs = await page.load({ locals: { user: users[2] }, platform });
	assert.equal(theirs.desk.myMeetings.length, 0);
	assert.ok(!JSON.stringify(theirs).includes('My final project'));
});

test('open requests are capped, and only the author can withdraw an open one', async (t) => {
	const { platform, sqlite } = fixture(t);
	for (let i = 0; i < 3; i++)
		assert.equal(
			await status(meetings.POST(event(platform, 1, { body: { topic: `q${i}` } }))),
			200
		);
	assert.equal(await status(meetings.POST(event(platform, 1, { body: { topic: 'q4' } }))), 429);

	assert.equal(
		await status(meetings.DELETE(event(platform, 2, { search: '?id=1' }))),
		404,
		'not yours'
	);
	assert.equal(await status(meetings.DELETE(event(platform, 1, { search: '?id=1' }))), 200);
	sqlite.exec("UPDATE meeting_requests SET status = 'scheduled' WHERE id = 2");
	assert.equal(
		await status(meetings.DELETE(event(platform, 1, { search: '?id=2' }))),
		404,
		'an answered request stays on the record'
	);
});

test('only the instructor answers; the reply is emailed to the student once', async (t) => {
	const { platform, sent, settle, sqlite } = fixture(t);
	await meetings.POST(event(platform, 1, { body: { topic: 'Help with ComfyUI' } }));
	await settle();
	sent.length = 0;

	const answer = { id: 1, reply: 'Thursday 3pm, A211H', status: 'scheduled' };
	assert.equal(
		await status(meetings.PUT(event(platform, 2, { body: answer }))),
		404,
		'students get a 404'
	);
	assert.equal(
		await status(meetings.PUT(event(platform, 3, { body: { id: 1, status: 'nope' } }))),
		400
	);
	assert.equal(await status(meetings.PUT(event(platform, 3, { body: answer }))), 200);
	await settle();
	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, 'one@example.test');
	assert.equal(sent[0].replyTo, CONTACT);
	assert.match(sent[0].text, /Thursday 3pm/);

	await meetings.PUT(event(platform, 3, { body: { id: 1, status: 'done' } }));
	await settle();
	assert.equal(sent.length, 1, 'marking done sends nothing');
	const row = sqlite.prepare('SELECT status, reply FROM meeting_requests WHERE id = 1').get();
	assert.deepEqual({ ...row }, { status: 'done', reply: 'Thursday 3pm, A211H' });

	const all = await page.load({ locals: { user: users[3] }, platform });
	assert.equal(all.desk.allMeetings[0].student.email, 'one@example.test');
});

test('the Fuser sheet shows names to classmates and addresses to the instructor', async (t) => {
	const { platform } = fixture(t);
	assert.equal(
		await status(fuser.POST(event(platform, 1, { body: { fuserEmail: 'not-an-email' } }))),
		400
	);
	assert.equal(
		await status(
			fuser.POST(
				event(platform, 1, { body: { fuserEmail: ' Ada@Personal.test ', note: 'thanks' } })
			)
		),
		200
	);
	await fuser.POST(event(platform, 2, { body: { fuserEmail: 'two@example.test' } }));

	const asTwo = (await page.load({ locals: { user: users[2] }, platform })).desk.fuserSheet;
	assert.deepEqual(
		asTwo.map((r) => r.name),
		['Ada', 'two']
	);
	const adaRow = asTwo.find((r) => r.name === 'Ada');
	assert.equal(adaRow.fuserEmail, undefined, "a classmate's address is withheld");
	assert.equal(adaRow.note, undefined);
	assert.equal(asTwo.find((r) => r.mine).fuserEmail, 'two@example.test');
	assert.ok(!JSON.stringify(asTwo).includes('personal.test'));

	const asProf = (await page.load({ locals: { user: users[3] }, platform })).desk.fuserSheet;
	assert.equal(
		asProf[0].fuserEmail,
		'ada@personal.test',
		'normalised and visible to the instructor'
	);
	assert.equal(asProf[0].accountEmail, 'one@example.test');
});

test('granting is instructor-only, and changing the address re-queues the row', async (t) => {
	const { platform, sqlite } = fixture(t);
	await fuser.POST(event(platform, 1, { body: { fuserEmail: 'ada@personal.test' } }));
	const row = () => ({
		...sqlite
			.prepare('SELECT fuser_email, status, granted_at FROM fuser_signups WHERE user_id = 1')
			.get()
	});

	assert.equal(
		await status(fuser.PUT(event(platform, 1, { body: { id: 1, status: 'granted' } }))),
		404
	);
	assert.equal(
		await status(fuser.PUT(event(platform, 3, { body: { id: 1, status: 'granted' } }))),
		200
	);
	assert.equal(row().status, 'granted');
	assert.ok(row().granted_at);

	await fuser.POST(
		event(platform, 1, { body: { fuserEmail: 'ada@personal.test', note: 'same address' } })
	);
	assert.equal(row().status, 'granted', 'editing the note keeps the grant');

	await fuser.POST(event(platform, 1, { body: { fuserEmail: 'ada@other.test' } }));
	assert.deepEqual(row(), { fuser_email: 'ada@other.test', status: 'requested', granted_at: null });
	assert.equal(
		sqlite.prepare('SELECT COUNT(*) AS n FROM fuser_signups').get().n,
		1,
		'still one row each'
	);

	await fuser.DELETE(event(platform, 1));
	assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM fuser_signups').get().n, 0);
});
