#!/usr/bin/env node
// Fills missing work/<slug>/vlm/page_NNNN.md files for pages where the VLM
// errored out (mostly Gemini RECITATION blocks on near-verbatim copyrighted
// text). For born-digital / mixed PDFs we have clean pdftotext output and use
// it as a fallback. For scanned / notes-heavy with no raw text, we emit a
// short placeholder so reconcile can produce a complete document.
//
// Usage:
//   node scripts/pdf-pipeline/fallback.js --all
//   node scripts/pdf-pipeline/fallback.js <slug>

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const WORK_DIR = join(ROOT, 'work');

function loadAllMetadata() {
	const out = [];
	for (const slug of readdirSync(WORK_DIR)) {
		const metaPath = join(WORK_DIR, slug, 'metadata.json');
		if (!existsSync(metaPath)) continue;
		try { out.push(JSON.parse(readFileSync(metaPath, 'utf-8'))); } catch {}
	}
	return out;
}

function pad4(n) { return String(n).padStart(4, '0'); }
function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }

// pdftotext -layout output: turn into one paragraph per blank-line block.
function rawTextToMarkdown(raw) {
	if (!raw || !raw.trim()) return '<!-- blank page -->';
	const lines = raw.split('\n').map((l) => l.replace(/\s+$/, ''));
	const paragraphs = [];
	let buf = [];
	for (const l of lines) {
		if (l.trim() === '') {
			if (buf.length) { paragraphs.push(buf.join(' ').replace(/\s+/g, ' ').trim()); buf = []; }
		} else {
			buf.push(l.trim());
		}
	}
	if (buf.length) paragraphs.push(buf.join(' ').replace(/\s+/g, ' ').trim());
	// De-hyphenate: "represen- tation" -> "representation"
	return paragraphs
		.map((p) => p.replace(/(\w)-\s+(\w)/g, '$1$2'))
		.filter((p) => p.length)
		.join('\n\n');
}

function fillSlug(meta) {
	const slugDir = join(WORK_DIR, meta.slug);
	const vlmDir = join(slugDir, 'vlm');
	if (!existsSync(vlmDir)) mkdirSync(vlmDir, { recursive: true });

	const counts = { existing: 0, fromRaw: 0, placeholder: 0 };
	for (let p = 1; p <= meta.pages; p++) {
		const vlmPath = join(vlmDir, `page_${pad4(p)}.md`);
		if (existsSync(vlmPath)) { counts.existing++; continue; }
		const rawPath = join(slugDir, `raw/page_${pad4(p)}.txt`);
		if (existsSync(rawPath)) {
			const raw = readFileSync(rawPath, 'utf-8');
			writeFileSync(vlmPath, rawTextToMarkdown(raw) + '\n');
			counts.fromRaw++;
		} else {
			writeFileSync(vlmPath, `<!-- page ${p}: extraction failed (likely Gemini RECITATION block) -->\n`);
			counts.placeholder++;
		}
	}
	return counts;
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const slug = args.find((a) => !a.startsWith('--'));
if (!all && !slug) { console.error('Pass <slug> or --all.'); process.exit(2); }

const allMeta = loadAllMetadata();
const targets = all ? allMeta : allMeta.filter((m) => m.slug === slug || m.slug.startsWith(slug));
if (targets.length === 0) { console.error('No match.'); process.exit(1); }

console.log(pad('class', 18) + pad('have', 6) + pad('+raw', 6) + pad('+pl', 5) + 'slug');
console.log('-'.repeat(110));
for (const meta of targets) {
	const c = fillSlug(meta);
	if (c.fromRaw > 0 || c.placeholder > 0) {
		console.log(pad(meta.classification, 18) + pad(c.existing, 6) + pad(c.fromRaw, 6) + pad(c.placeholder, 5) + meta.slug);
	}
}
