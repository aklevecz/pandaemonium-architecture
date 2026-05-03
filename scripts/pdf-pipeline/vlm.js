#!/usr/bin/env node
// Stage 4 of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Per-page VLM pass: render → Gemini vision (page image + raw OCR text) →
// clean per-page markdown. Born-digital-clean PDFs send the pdftotext output
// alongside the image (so Gemini corrects rather than re-derives). Scanned /
// notes-heavy / mixed-thin pages send image only.
//
// Switched from Claude to Gemini because Anthropic's content filter blocks
// even benign academic page images on this corpus (verified with curl: Barad
// page 1 + 14 both refused).
//
// Outputs:
//   work/<slug>/vlm/page_NNNN.md    one per page
//   work/<slug>/vlm.json            manifest with token usage + per-page status
//
// Usage:
//   node scripts/pdf-pipeline/vlm.js <slug>                  process all pages
//   node scripts/pdf-pipeline/vlm.js <slug> --pages=3,17,33  process specific pages
//   node scripts/pdf-pipeline/vlm.js <slug> --force          re-do cached pages
//   node scripts/pdf-pipeline/vlm.js <slug> --concurrency=4  parallel requests
//
// Requires GEMINI_API_KEY in .env. Model ID overridable via PDF_PIPELINE_MODEL.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const WORK_DIR = join(ROOT, 'work');
const MODEL = process.env.PDF_PIPELINE_MODEL ?? 'gemini-3.1-flash-lite-preview';
const MAX_OUTPUT_TOKENS = 8192;

// --- env loading -----------------------------------------------------------

function loadDotenv() {
	const envPath = join(ROOT, '.env');
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
	}
}

// --- arg parsing -----------------------------------------------------------

function parseArgs(argv) {
	const args = { force: false, slug: null, pages: null, concurrency: 3, all: false };
	for (const a of argv) {
		if (a === '--force') args.force = true;
		else if (a === '--all') args.all = true;
		else if (a.startsWith('--pages=')) {
			args.pages = a
				.slice('--pages='.length)
				.split(',')
				.map((s) => Number(s.trim()))
				.filter(Number.isFinite);
		} else if (a.startsWith('--concurrency=')) {
			args.concurrency = Math.max(1, Number(a.slice('--concurrency='.length)));
		} else if (!args.slug) args.slug = a;
		else { console.error(`Unexpected arg: ${a}`); process.exit(2); }
	}
	if (!args.slug && !args.all) {
		console.error('Pass a slug as the first arg, or --all.');
		process.exit(2);
	}
	return args;
}

function loadSlug(slug) {
	const candidates = readdirSync(WORK_DIR).filter((s) => s === slug || s.startsWith(slug));
	if (candidates.length === 0) { console.error(`No work dir matches "${slug}".`); process.exit(1); }
	if (candidates.length > 1) {
		console.error(`Slug "${slug}" is ambiguous:`);
		for (const c of candidates) console.error(`  ${c}`);
		process.exit(1);
	}
	const slugDir = join(WORK_DIR, candidates[0]);
	const meta = JSON.parse(readFileSync(join(slugDir, 'metadata.json'), 'utf-8'));
	const renderManifest = JSON.parse(readFileSync(join(slugDir, 'render.json'), 'utf-8'));
	const extractPath = join(slugDir, 'extract.json');
	const extractManifest = existsSync(extractPath)
		? JSON.parse(readFileSync(extractPath, 'utf-8'))
		: null;
	return { slugDir, meta, renderManifest, extractManifest };
}

// --- prompt ----------------------------------------------------------------

const SYSTEM_PROMPT = `You convert one rendered page of a scholarly PDF into clean Markdown for a course reading site. Students will read this in a web reader with notes, highlights, and a chat assistant. Faithfulness matters more than polish.

OUTPUT FORMAT
- Output Markdown only. No preamble, no commentary, no fenced output wrapper.
- Output for ONE page only — what you see in the image.

WHAT TO PRESERVE
- The author's words exactly. Do not paraphrase, summarize, translate, or "improve" prose.
- Paragraph structure as it appears visually. Each paragraph is one block separated by a blank line. Do not merge paragraphs across the page.
- Italics with *single asterisks*, bold with **double**. Small caps -> regular case. Drop-cap initials are just normal letters.
- Smart quotes, en/em dashes, ellipses as written.
- Footnote markers in the body become \`[^N]\` where N is the printed number. Footnote bodies at the bottom of the page become a fenced section at the end of the page output:
  \`\`\`
  ---
  [^1]: footnote text
  [^2]: ...
  \`\`\`
  Use the printed footnote numbers verbatim — do not renumber.

HEADINGS
- Determine heading level from visual hierarchy in the image, not from text guessing. Chapter title -> \`#\`. Major section -> \`##\`. Subsection -> \`###\`.
- Running headers/footers (the small repeated text at top/bottom of each page like "INTRA-ACTIONS MATTER" or page numbers) MUST be omitted entirely.

FIGURES
- For every figure or image on the page, emit (in order):
  \`![Figure: short factual description of what the figure depicts](#fig-pN-i)\`
  on its own line, where N is the PDF page number you were told (NOT the printed page number on the page), and i is the 1-based figure index on this page.
- Immediately below, in a blockquote, transcribe any caption AND any text-inside-the-figure (labels, callouts, hand-lettered annotations). Mark the caption clearly:
  \`> **Caption:** <caption text as printed>\`
  \`> **Figure text:** <any text inside the figure region>\`
- The caption is part of the figure block. Do NOT also emit the caption text as a normal paragraph elsewhere on the page — once is enough.
- If a figure number prefix like "13" or "Figure 4." appears as part of the caption, include it in the caption text but do NOT treat it as a heading or numbered list.
- Never drop figure-internal text. Never substitute the figure for an ASCII rendering or pseudo-table.

DE-HYPHENATION AND COLUMN WRAP
- Join hyphenated linebreaks: "represen-\\ntation" -> "representation".
- If the page is two-column, read top-to-bottom of the left column first, then the right.

WHAT NOT TO DO
- Do not add a page number heading like "## Page 14".
- Do not add notes about your process.
- Do not output XML or HTML tags. Pure Markdown.
- If a page is genuinely blank, output exactly: \`<!-- blank page -->\`.

You will be given:
1. The rendered page as an image.
2. (Sometimes) the raw text extracted by pdftotext, as a starting point. Use it to confirm spellings of proper nouns and to recover small text you might struggle to read in the image. The image is the ground truth — if the raw text and the image disagree, trust the image.`;

// --- API call --------------------------------------------------------------

async function callGemini({ apiKey, imageBase64, rawText, pageNum, totalPages, slug }) {
	const userText = `Page ${pageNum} of ${totalPages} from "${slug}".\n\n${
		rawText && rawText.trim().length
			? `Raw pdftotext output for this page (use as a hint, not gospel):\n\n---\n${rawText}\n---`
			: '(No raw text extraction for this page — image-only.)'
	}\n\nReturn the page as clean Markdown per the system instructions.`;

	const body = {
		systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
		contents: [
			{
				role: 'user',
				parts: [
					{ inlineData: { mimeType: 'image/png', data: imageBase64 } },
					{ text: userText }
				]
			}
		],
		generationConfig: {
			temperature: 0,
			maxOutputTokens: MAX_OUTPUT_TOKENS
		}
	};

	const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Gemini ${res.status}: ${text.slice(0, 500)}`);
	}
	const json = await res.json();
	const candidate = json.candidates?.[0];
	if (!candidate) throw new Error(`Gemini returned no candidate: ${JSON.stringify(json).slice(0, 300)}`);
	if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
		throw new Error(`Gemini finishReason=${candidate.finishReason}: ${JSON.stringify(candidate).slice(0, 300)}`);
	}
	const md = (candidate.content?.parts ?? []).map((p) => p.text ?? '').join('');
	const u = json.usageMetadata ?? {};
	const usage = {
		input_tokens: u.promptTokenCount ?? 0,
		output_tokens: u.candidatesTokenCount ?? 0,
		total_tokens: u.totalTokenCount ?? 0
	};
	return { md, usage };
}

// --- per-page worker -------------------------------------------------------

function pageRawTextPath(slugDir, pageNum) {
	return join(slugDir, `raw/page_${String(pageNum).padStart(4, '0')}.txt`);
}

function pageVlmPath(slugDir, pageNum) {
	return join(slugDir, `vlm/page_${String(pageNum).padStart(4, '0')}.md`);
}

async function processPage({ apiKey, slugDir, slug, pageEntry, totalPages, classification, force }) {
	const out = pageVlmPath(slugDir, pageEntry.page);
	if (existsSync(out) && !force) {
		return { page: pageEntry.page, status: 'cached', usage: null };
	}
	const imgPath = join(slugDir, pageEntry.file);
	const imageBase64 = readFileSync(imgPath).toString('base64');
	// Only send raw text for classes whose text layer is trustworthy.
	// scanned/notes-heavy went through pdftotext skipping; even if a stale
	// raw/ file exists from an earlier classification, ignore it.
	const useRawText = classification === 'born-digital-clean' || classification === 'mixed';
	const rawTextPath = pageRawTextPath(slugDir, pageEntry.page);
	const rawText = useRawText && existsSync(rawTextPath) ? readFileSync(rawTextPath, 'utf-8') : '';
	const t0 = Date.now();
	const { md, usage } = await callGemini({
		apiKey,
		imageBase64,
		rawText,
		pageNum: pageEntry.page,
		totalPages,
		slug
	});
	const dt = Date.now() - t0;
	mkdirSync(join(slugDir, 'vlm'), { recursive: true });
	writeFileSync(out, md);
	return { page: pageEntry.page, status: 'fresh', usage, durationMs: dt };
}

// --- bounded parallelism ---------------------------------------------------

async function runWithConcurrency(items, n, fn) {
	const results = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: n }, async () => {
		while (true) {
			const i = next++;
			if (i >= items.length) return;
			try {
				results[i] = await fn(items[i]);
			} catch (err) {
				results[i] = { page: items[i].page, status: 'error', error: err.message };
			}
		}
	});
	await Promise.all(workers);
	return results;
}

// --- main ------------------------------------------------------------------

loadDotenv();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY not set (checked .env).'); process.exit(1); }

async function processSlug(slug, args) {
	const { slugDir, meta, renderManifest } = loadSlug(slug);
	let pageEntries = renderManifest.pages;
	if (args.pages) pageEntries = pageEntries.filter((p) => args.pages.includes(p.page));

	console.log(`vlm: ${meta.slug}`);
	console.log(`  class=${meta.classification}  pages=${pageEntries.length}/${renderManifest.pageCount}  model=${MODEL}  concurrency=${args.concurrency}`);

	const t0 = Date.now();
	const results = await runWithConcurrency(pageEntries, args.concurrency, (p) =>
		processPage({
			apiKey,
			slugDir,
			slug: meta.slug,
			pageEntry: p,
			totalPages: meta.pages,
			classification: meta.classification,
			force: args.force
		})
	);
	const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

	const totals = { input: 0, output: 0, fresh: 0, cached: 0, error: 0 };
	for (const r of results) {
		totals[r.status] = (totals[r.status] ?? 0) + 1;
		if (r.usage) {
			totals.input += r.usage.input_tokens ?? 0;
			totals.output += r.usage.output_tokens ?? 0;
		}
	}

	const errors = results.filter((r) => r.status === 'error');
	for (const e of errors) console.error(`  [page ${e.page}] error: ${e.error}`);

	writeFileSync(
		join(slugDir, 'vlm.json'),
		JSON.stringify(
			{
				slug: meta.slug,
				generatedAt: new Date().toISOString(),
				model: MODEL,
				pageCount: renderManifest.pageCount,
				processed: results.map((r) => ({ ...r, error: r.error ?? undefined })),
				totals
			},
			null,
			2
		)
	);

	console.log(`  done in ${elapsedSec}s — fresh=${totals.fresh ?? 0} cached=${totals.cached ?? 0} error=${totals.error ?? 0}`);
	console.log(`  tokens: input=${totals.input} output=${totals.output}`);
	return totals;
}

const args = parseArgs(process.argv.slice(2));

let slugs;
if (args.all) {
	slugs = readdirSync(WORK_DIR).filter((s) => existsSync(join(WORK_DIR, s, 'render.json'))).sort();
} else {
	slugs = [args.slug];
}

const grand = { input: 0, output: 0, fresh: 0, cached: 0, error: 0 };
const tStart = Date.now();
for (const slug of slugs) {
	try {
		const t = await processSlug(slug, args);
		for (const k of Object.keys(grand)) grand[k] += t[k] ?? 0;
	} catch (err) {
		console.error(`[skip] ${slug}: ${err.message}`);
	}
}
if (slugs.length > 1) {
	const dt = ((Date.now() - tStart) / 1000).toFixed(1);
	console.log(`\n=== grand total: ${slugs.length} PDFs in ${dt}s ===`);
	console.log(`fresh=${grand.fresh} cached=${grand.cached} error=${grand.error}`);
	console.log(`tokens: input=${grand.input} output=${grand.output}`);
	const cost = grand.input * 0.25 / 1e6 + grand.output * 1.5 / 1e6;
	console.log(`approx cost (Flash-Lite): $${cost.toFixed(3)}`);
}
