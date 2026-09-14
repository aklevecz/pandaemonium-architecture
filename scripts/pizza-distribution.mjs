#!/usr/bin/env node
// One prompt, many draws: what does the model think "pizza" is?
//
// Generates N images from a single unchanging prompt, categorises each one with
// a VLM against a fixed schema, and reports the distribution. The point is not
// the pizzas. It is that a prompt does not name an image, it names a
// distribution, and the shape of that distribution was decided by the training
// set long before anyone typed anything.
//
// Three stages, each resumable: an image or a label already on disk is never
// re-fetched, so an interrupted run costs nothing to resume. Pass --force to
// redo.
//
//   node scripts/pizza-distribution.mjs                       100 images, all stages
//   node scripts/pizza-distribution.mjs --n=20                fewer
//   node scripts/pizza-distribution.mjs --prompt="a dog"      different prompt
//   node scripts/pizza-distribution.mjs --prompt=             no prompt at all
//   (non-pizza prompts use the general schema; force one with --schema=pizza)
//   node scripts/pizza-distribution.mjs --stage=report        just re-print
//   node scripts/pizza-distribution.mjs --concurrency=8
//
// Outputs (work/ is gitignored):
//   work/<slug>/images/img_0001.jpg
//   work/<slug>/labels/img_0001.json
//   work/<slug>/results.json
//   work/<slug>/report.html
//
// Requires GEMINI_API_KEY in .env.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const IMAGE_MODEL = process.env.PIZZA_IMAGE_MODEL ?? 'gemini-3.1-flash-image';
const VLM_MODEL = process.env.PIZZA_VLM_MODEL ?? 'gemini-3.8-flash';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

// The axes. Every value is a closed set: an open-ended "describe this image"
// gives prose that cannot be counted, and the whole exercise is counting.
const PIZZA_SCHEMA = {
	type: 'object',
	properties: {
		form: { type: 'string', enum: ['whole_pizza', 'single_slice', 'multiple_slices', 'other'] },
		view: { type: 'string', enum: ['top_down', 'three_quarter', 'side', 'macro_closeup'] },
		toppings: {
			type: 'string',
			enum: ['cheese_only', 'pepperoni', 'vegetable', 'mixed_meat', 'seafood', 'other']
		},
		style: { type: 'string', enum: ['photograph', 'illustration', 'render_3d', 'other'] },
		setting: {
			type: 'string',
			enum: ['wooden_board', 'plate', 'table', 'isolated_background', 'other']
		},
		crust: { type: 'string', enum: ['thin', 'thick_pan', 'stuffed', 'neapolitan_charred', 'other'] },
		people_visible: { type: 'boolean' },
		slice_removed: { type: 'boolean' }
	},
	required: [
		'form',
		'view',
		'toppings',
		'style',
		'setting',
		'crust',
		'people_visible',
		'slice_removed'
	]
};

// For prompts that are not about pizza, including the empty prompt, where the
// question is what the model draws when asked for nothing in particular.
const GENERAL_SCHEMA = {
	type: 'object',
	properties: {
		subject: {
			type: 'string',
			enum: [
				'person',
				'animal',
				'food',
				'plant_or_flower',
				'landscape',
				'building_or_city',
				'interior_room',
				'vehicle',
				'object',
				'abstract_pattern',
				'text_or_graphic',
				'other'
			]
		},
		style: {
			type: 'string',
			enum: ['photograph', 'illustration', 'painting', 'render_3d', 'other']
		},
		setting: {
			type: 'string',
			enum: ['outdoor_nature', 'outdoor_urban', 'indoor', 'plain_background', 'none']
		},
		framing: { type: 'string', enum: ['close_up', 'medium', 'wide', 'top_down'] },
		light: { type: 'string', enum: ['daylight', 'golden_hour', 'night', 'studio', 'not_applicable'] },
		palette: { type: 'string', enum: ['warm', 'cool', 'neutral', 'vivid_mixed', 'black_and_white'] },
		people_visible: { type: 'boolean' }
	},
	required: ['subject', 'style', 'setting', 'framing', 'light', 'palette', 'people_visible']
};

const SCHEMAS = { pizza: PIZZA_SCHEMA, general: GENERAL_SCHEMA };

// --- env ------------------------------------------------------------------
// Same manual .env read the pdf-pipeline uses, so there is no dotenv dependency.
function loadEnv() {
	if (!existsSync('.env')) return;
	for (const line of readFileSync('.env', 'utf-8').split('\n')) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
	}
}

// --- args -----------------------------------------------------------------
function parseArgs(argv) {
	const a = { n: 100, concurrency: 5, prompt: 'pizza', stage: 'all', force: false, schema: '' };
	for (const arg of argv) {
		if (arg === '--force') a.force = true;
		else if (arg.startsWith('--schema=')) a.schema = arg.slice(9);
		else if (arg.startsWith('--n=')) a.n = Math.max(1, Number(arg.slice(4)));
		else if (arg.startsWith('--concurrency=')) a.concurrency = Math.max(1, Number(arg.slice(14)));
		else if (arg.startsWith('--prompt=')) a.prompt = arg.slice(9);
		else if (arg.startsWith('--stage=')) a.stage = arg.slice(8);
		else if (arg === '-h' || arg === '--help') {
			console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 26).join('\n'));
			process.exit(0);
		}
	}
	return a;
}

const slugify = (s) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'no-prompt';

// --- http -----------------------------------------------------------------
// Retries the things worth retrying (rate limits, transient 5xx) and gives up
// on the things that will never succeed (bad key, bad request).
async function callGemini(model, body, apiKey, { attempts = 4 } = {}) {
	let lastErr;
	for (let i = 0; i < attempts; i++) {
		try {
			const res = await fetch(`${API}/${model}:generateContent?key=${apiKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) return await res.json();
			const text = await res.text().catch(() => '');
			if (res.status === 429 || res.status >= 500) {
				lastErr = new Error(`${res.status}: ${text.slice(0, 160)}`);
				await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
				continue;
			}
			throw new Error(`${res.status}: ${text.slice(0, 240)}`);
		} catch (err) {
			lastErr = err;
			if (i === attempts - 1) break;
			await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
		}
	}
	throw lastErr;
}

// Small worker pool: fixed number of parallel tasks over a list of indices.
async function pool(items, concurrency, fn) {
	let next = 0;
	const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
		while (next < items.length) {
			const i = next++;
			await fn(items[i], i);
		}
	});
	await Promise.all(runners);
}

// --- stage 1: generate ----------------------------------------------------
async function generate(dir, args, apiKey) {
	const out = join(dir, 'images');
	mkdirSync(out, { recursive: true });
	const todo = [];
	for (let i = 1; i <= args.n; i++) {
		const p = join(out, `img_${String(i).padStart(4, '0')}.jpg`);
		if (args.force || !existsSync(p)) todo.push({ i, path: p });
	}
	const cached = args.n - todo.length;
	if (!todo.length) {
		console.log(`generate: ${cached} already on disk, nothing to do`);
		return;
	}
	console.log(
		`generate: ${todo.length} to fetch (${cached} cached)  model=${IMAGE_MODEL}  concurrency=${args.concurrency}`
	);
	let done = 0,
		failed = 0;
	const t0 = Date.now();
	await pool(todo, args.concurrency, async ({ i, path }) => {
		try {
			// Same prompt every time. No seed is exposed by this API, so the only
			// thing varying between runs is the sampler's own randomness.
			const d = await callGemini(
				IMAGE_MODEL,
				{
					contents: [{ parts: [{ text: args.prompt }] }],
					generationConfig: { responseModalities: ['IMAGE'] }
				},
				apiKey
			);
			const part = (d.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData);
			if (!part) throw new Error(`no image part (finishReason=${d.candidates?.[0]?.finishReason})`);
			writeFileSync(path, Buffer.from(part.inlineData.data, 'base64'));
			done++;
		} catch (err) {
			failed++;
			console.error(`  [${i}] ${err.message}`);
		}
		if ((done + failed) % 10 === 0) process.stdout.write(`  ${done + failed}/${todo.length}\n`);
	});
	console.log(`generate: ${done} ok, ${failed} failed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// --- stage 2: categorise --------------------------------------------------
async function categorise(dir, args, apiKey) {
	const imgDir = join(dir, 'images');
	const labDir = join(dir, 'labels');
	mkdirSync(labDir, { recursive: true });
	const images = existsSync(imgDir) ? readdirSync(imgDir).filter((f) => f.endsWith('.jpg')).sort() : [];
	if (!images.length) {
		console.log('categorise: no images found, run the generate stage first');
		return;
	}
	const todo = images.filter(
		(f) => args.force || !existsSync(join(labDir, f.replace(/\.jpg$/, '.json')))
	);
	const cached = images.length - todo.length;
	if (!todo.length) {
		console.log(`categorise: ${cached} already labelled, nothing to do`);
		return;
	}
	console.log(
		`categorise: ${todo.length} to label (${cached} cached)  model=${VLM_MODEL}  concurrency=${args.concurrency}`
	);
	let done = 0,
		failed = 0;
	const t0 = Date.now();
	await pool(todo, args.concurrency, async (file) => {
		try {
			const b64 = readFileSync(join(imgDir, file)).toString('base64');
			const d = await callGemini(
				VLM_MODEL,
				{
					contents: [
						{
							parts: [
								{
									text: 'Categorise this image against the schema. Judge only what is visible. Answer with the JSON object and nothing else.'
								},
								{ inlineData: { mimeType: 'image/jpeg', data: b64 } }
							]
						}
					],
					generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA }
				},
				apiKey
			);
			const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!txt) throw new Error(`no text part (finishReason=${d.candidates?.[0]?.finishReason})`);
			writeFileSync(join(labDir, file.replace(/\.jpg$/, '.json')), JSON.stringify(JSON.parse(txt)));
			done++;
		} catch (err) {
			failed++;
			console.error(`  [${file}] ${err.message}`);
		}
		if ((done + failed) % 10 === 0) process.stdout.write(`  ${done + failed}/${todo.length}\n`);
	});
	console.log(`categorise: ${done} ok, ${failed} failed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// --- stage 3: report ------------------------------------------------------
function tally(labels) {
	const counts = {};
	for (const axis of AXES) {
		counts[axis] = {};
		for (const l of labels) {
			const v = String(l[axis]);
			counts[axis][v] = (counts[axis][v] ?? 0) + 1;
		}
	}
	return counts;
}

// Shannon entropy in bits, plus the share held by the single commonest value.
// Together these say how peaked an axis is: low entropy and a high top share
// mean the prompt is barely choosing at all.
function stats(dist, n) {
	let h = 0;
	for (const c of Object.values(dist)) {
		const p = c / n;
		if (p > 0) h -= p * Math.log2(p);
	}
	const top = Object.entries(dist).sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
	return { entropy: h, maxEntropy: Math.log2(Object.keys(dist).length || 1), top };
}

function report(dir, args) {
	const labDir = join(dir, 'labels');
	const files = existsSync(labDir) ? readdirSync(labDir).filter((f) => f.endsWith('.json')) : [];
	if (!files.length) {
		console.log('report: no labels found, run the categorise stage first');
		return;
	}
	const labels = files.map((f) => JSON.parse(readFileSync(join(labDir, f), 'utf-8')));
	const n = labels.length;
	const counts = tally(labels);

	console.log(`\n${'='.repeat(66)}\n  "${args.prompt}"  ·  ${n} draws  ·  ${IMAGE_MODEL}\n${'='.repeat(66)}`);
	for (const axis of AXES) {
		const s = stats(counts[axis], n);
		const pct = ((s.top[1] / n) * 100).toFixed(0);
		console.log(`\n${axis}   (entropy ${s.entropy.toFixed(2)} of ${s.maxEntropy.toFixed(2)} bits)`);
		for (const [v, c] of Object.entries(counts[axis]).sort((a, b) => b[1] - a[1])) {
			const share = c / n;
			console.log(
				`  ${v.padEnd(22)} ${String(c).padStart(4)}  ${(share * 100).toFixed(0).padStart(3)}%  ${'█'.repeat(Math.round(share * 40))}`
			);
		}
		console.log(`  → modal value "${s.top[0]}" holds ${pct}% of all draws`);
	}

	// Exact-combination collapse: how many of the 2,880 schema-representable
	// images the model actually visits.
	const combos = new Map();
	for (const l of labels) {
		const k = AXES.map((a) => l[a]).join('|');
		combos.set(k, (combos.get(k) ?? 0) + 1);
	}
	const sorted = [...combos.entries()].sort((a, b) => b[1] - a[1]);
	console.log(`\n${'-'.repeat(66)}\ndistinct full combinations: ${combos.size} of ${n} draws`);
	console.log('commonest exact images:');
	for (const [k, c] of sorted.slice(0, 5)) console.log(`  ${String(c).padStart(3)}×  ${k}`);

	writeFileSync(
		join(dir, 'results.json'),
		JSON.stringify({ prompt: args.prompt, n, model: IMAGE_MODEL, axes: AXES, counts, labels }, null, 2)
	);
	writeFileSync(join(dir, 'report.html'), html(args.prompt, n, counts, sorted));
	console.log(`\nwrote ${join(dir, 'results.json')} and report.html\n`);
}

function html(prompt, n, counts, combos) {
	const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
	const bars = AXES.map((axis) => {
		const s = stats(counts[axis], n);
		const rows = Object.entries(counts[axis])
			.sort((a, b) => b[1] - a[1])
			.map(([v, c]) => {
				const pct = ((c / n) * 100).toFixed(0);
				return `<tr><td>${esc(v)}</td><td class="n">${c}</td><td class="bar"><span style="width:${(c / n) * 100}%"></span></td><td class="n">${pct}%</td></tr>`;
			})
			.join('');
		return `<section><h2>${esc(axis)} <small>entropy ${s.entropy.toFixed(2)} / ${s.maxEntropy.toFixed(2)} bits</small></h2><table>${rows}</table></section>`;
	}).join('');
	return `<!doctype html><meta charset="utf-8"><title>"${esc(prompt)}" · ${n} draws</title>
<style>
:root{--ink:#16202e;--ground:#eef0f3;--rule:#c9d2dc;--accent:#c4392f;--muted:#5c6b7e}
@media(prefers-color-scheme:dark){:root{--ink:#e4e9ef;--ground:#101720;--rule:#2a3644;--accent:#e5614f;--muted:#93a2b4}}
body{background:var(--ground);color:var(--ink);font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;max-width:50rem;margin:0 auto;padding:2rem 1.25rem 4rem}
h1{font-size:1.6rem;margin:0 0 .2rem}p.sub{color:var(--muted);margin:0 0 2rem}
section{margin:0 0 1.6rem;border-top:1px solid var(--rule);padding-top:.7rem}
h2{font-size:.95rem;margin:0 0 .5rem;font-weight:600}h2 small{color:var(--muted);font-weight:400}
table{width:100%;border-collapse:collapse}td{padding:.15rem .4rem .15rem 0;vertical-align:middle}
td.n{text-align:right;width:3.2rem;color:var(--muted);font-variant-numeric:tabular-nums}
td.bar{width:55%}td.bar span{display:block;height:11px;background:var(--accent)}
code{color:var(--muted);font-size:.8rem}
</style>
<h1>&ldquo;${esc(prompt)}&rdquo;</h1>
<p class="sub">${n} draws from the same prompt &middot; ${esc(IMAGE_MODEL)} &middot; ${combos.length} distinct combinations</p>
${bars}
<section><h2>commonest exact combinations</h2>
${combos.slice(0, 8).map(([k, c]) => `<div><code>${String(c).padStart(3)}&times; ${esc(k)}</code></div>`).join('')}
</section>`;
}

// --- main -----------------------------------------------------------------
loadEnv();
const args = parseArgs(process.argv.slice(2));
// Pizza prompts keep the pizza axes; anything else, and the empty prompt,
// defaults to the general ones.
const schemaName = args.schema || (/pizza/i.test(args.prompt) ? 'pizza' : 'general');
const SCHEMA = SCHEMAS[schemaName];
if (!SCHEMA) {
	console.error(`unknown --schema=${schemaName} (pizza or general)`);
	process.exit(1);
}
const AXES = Object.keys(SCHEMA.properties);
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
	console.error('GEMINI_API_KEY not set (checked .env).');
	process.exit(1);
}
const dir = join('work', `prompt-distribution-${slugify(args.prompt)}`);
mkdirSync(dir, { recursive: true });

if (args.stage === 'all' || args.stage === 'generate') await generate(dir, args, apiKey);
if (args.stage === 'all' || args.stage === 'categorise' || args.stage === 'categorize')
	await categorise(dir, args, apiKey);
if (args.stage === 'all' || args.stage === 'report') report(dir, args);
