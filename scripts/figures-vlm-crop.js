#!/usr/bin/env node
// Extract figures from a SCANNED book where figures are baked into full-page
// scans (so pdfimages can't pull them out). For each [Figure: …] marker the
// VLM left in work/<slug>/vlm/page_NNNN.md, ask Gemini for the figure's
// bounding box on that page, then crop that region straight out of the PDF
// with pdftoppm. Crops land in work/<slug>/figures/<file>.png (uploaded by
// scripts/upload-figures.sh) and a manifest records marker -> url so the
// markdown can be rewritten to show the image.
//
// Usage: node scripts/figures-vlm-crop.js <slug> [--dpi=220]
// Resumable: existing crops are skipped. Then run --inject to rewrite markdown.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = process.cwd();
const slug = process.argv[2];
if (!slug) { console.error('usage: figures-vlm-crop.js <slug> [--inject] [--dpi=220]'); process.exit(1); }
const INJECT = process.argv.includes('--inject');
const DPI = Number((process.argv.find((a) => a.startsWith('--dpi=')) || '--dpi=220').split('=')[1]);
const R2_BASE = 'https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev';
const MODEL = 'gemini-3.1-flash-lite-preview';

const figDir = join(ROOT, 'work', slug, 'figures');
const vlmDir = join(ROOT, 'work', slug, 'vlm');
const manifestPath = join(ROOT, 'work', slug, 'figures-crop-manifest.json');
mkdirSync(figDir, { recursive: true });

// Locate the source PDF by matching the slugified filename.
const slugify = (f) => f.replace(/\.(pdf)$/i, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const PDF = readdirSync(join(ROOT, 'PDFs')).filter((f) => /\.pdf$/i.test(f)).find((f) => slugify(f) === slug);
if (!PDF) { console.error('no PDF in PDFs/ matching slug', slug); process.exit(1); }
const PDF_PATH = join(ROOT, 'PDFs', PDF);

// Decorative markers we don't want as figures.
const SKIP = /\b(logo|colophon|publisher|internet archive|penguin books|barcode|stamp|imprint|isbn|library)\b/i;

const markdownPath = join(ROOT, 'markdown', PDF.replace(/\.pdf$/i, '.md'));

// ---------- inject mode: rewrite markdown from the manifest ----------
if (INJECT) {
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
	let md = readFileSync(markdownPath, 'utf8');
	let n = 0;
	for (const fig of manifest.figures) {
		if (!fig.url) continue;
		// Replace the literal marker line with an image (alt = description).
		const marker = `**[Figure: ${fig.desc}]**`;
		const img = `![${fig.desc.replace(/[[\]]/g, '')}](${fig.url})`;
		if (md.includes(marker)) { md = md.replace(marker, img); n++; }
	}
	writeFileSync(markdownPath, md);
	console.log(`injected ${n}/${manifest.figures.filter((f) => f.url).length} figure images into ${markdownPath}`);
	process.exit(0);
}

const key = readFileSync(join(ROOT, '.env'), 'utf8').match(/^GEMINI_API_KEY\s*=\s*"?([^"\n]+)"?/m)[1];

// Page sizes (points) for every page, parsed once.
const info = execSync(`pdfinfo -l 99999 "${PDF_PATH}"`, { encoding: 'utf8' });
const defSize = info.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);
function pageSize(p) {
	try {
		const i = execSync(`pdfinfo -f ${p} -l ${p} "${PDF_PATH}"`, { encoding: 'utf8' });
		const m = i.match(/Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/) || defSize;
		return [parseFloat(m[1]), parseFloat(m[2])];
	} catch {
		return [parseFloat(defSize[1]), parseFloat(defSize[2])];
	}
}

// Collect figure markers: { page, desc } from each vlm page file.
const figures = [];
for (const f of readdirSync(vlmDir).sort()) {
	const m = f.match(/page_(\d+)\.md$/);
	if (!m) continue;
	const page = Number(m[1]);
	const text = readFileSync(join(vlmDir, f), 'utf8');
	for (const line of text.split('\n')) {
		// VLM emits placeholder image syntax: ![Figure: desc](#fig-pNN-iI)
		const fm = line.match(/!\[Figure:\s*([^\]]+)\]\(#fig/);
		if (fm) {
			const desc = fm[1].trim();
			if (SKIP.test(desc)) continue;
			figures.push({ page, desc });
		}
	}
}
console.log(`${figures.length} candidate figures across ${new Set(figures.map((f) => f.page)).size} pages`);

async function bbox(page) {
	const tmp = join(figDir, `_probe_${page}.png`);
	execSync(`pdftoppm -f ${page} -l ${page} -r 100 -png -singlefile "${PDF_PATH}" "${tmp.replace(/\.png$/, '')}"`);
	const b64 = readFileSync(tmp).toString('base64');
	const prompt = 'This is a scanned book page. Find the main FIGURE / diagram / photograph / illustration / chart (NOT body text, NOT the running header or page number, NOT the text caption). Return ONLY compact JSON: {"has_figure": true|false, "box_2d": [ymin, xmin, ymax, xmax]} as a tight bounding box around the figure(s) including any in-figure labels but excluding paragraphs of body text, normalized 0-1000. If multiple figures, enclose them all. If there is no real figure (text only), has_figure=false.';
	for (let attempt = 0; attempt < 5; attempt++) {
		const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
			method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
			body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: 'image/png', data: b64 } }, { text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } })
		});
		if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt)); continue; }
		const j = await res.json();
		if (!res.ok) throw new Error(`gemini ${res.status}: ${JSON.stringify(j).slice(0, 160)}`);
		const t = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
		try { return JSON.parse(t); } catch { return { has_figure: false }; }
	}
	return { has_figure: false };
}

// One crop per page (the bbox encloses all figures on that page); dedupe pages.
const byPage = new Map();
for (const f of figures) if (!byPage.has(f.page)) byPage.set(f.page, f.desc);

const out = [];
let done = 0;
for (const [page, desc] of byPage) {
	const file = `fig_p${String(page).padStart(4, '0')}.png`;
	const dest = join(figDir, file);
	const url = `${R2_BASE}/figures/${slug}/${file}`;
	if (existsSync(dest)) { out.push({ page, desc, file, url }); done++; continue; }
	try {
		const box = await bbox(page);
		if (!box.has_figure || !Array.isArray(box.box_2d)) { out.push({ page, desc, file: null, url: null, skipped: 'no_figure' }); continue; }
		const [ymin, xmin, ymax, xmax] = box.box_2d;
		const [wpts, hpts] = pageSize(page);
		const pw = (wpts / 72) * DPI, ph = (hpts / 72) * DPI;
		const pad = 0.012;
		const x = Math.max(0, Math.round((xmin / 1000 - pad) * pw));
		const y = Math.max(0, Math.round((ymin / 1000 - pad) * ph));
		const W = Math.max(8, Math.round(Math.min(pw - x, ((xmax - xmin) / 1000 + 2 * pad) * pw)));
		const H = Math.max(8, Math.round(Math.min(ph - y, ((ymax - ymin) / 1000 + 2 * pad) * ph)));
		execSync(`pdftoppm -f ${page} -l ${page} -r ${DPI} -x ${x} -y ${y} -W ${W} -H ${H} -png -singlefile "${PDF_PATH}" "${dest.replace(/\.png$/, '')}"`);
		out.push({ page, desc, file, url });
		done++;
		if (done % 10 === 0) console.log(`  ${done} cropped`);
	} catch (e) {
		console.error(`  page ${page} failed: ${String(e.message).slice(0, 120)}`);
		out.push({ page, desc, file: null, url: null, error: String(e.message).slice(0, 120) });
	}
}
// clean probes
for (const f of readdirSync(figDir)) if (f.startsWith('_probe_')) try { execSync(`rm "${join(figDir, f)}"`); } catch {}
writeFileSync(manifestPath, JSON.stringify({ slug, dpi: DPI, figures: out }, null, 1));
console.log(`done: ${out.filter((f) => f.url).length} crops, ${out.filter((f) => !f.url).length} skipped/failed -> ${manifestPath}`);
