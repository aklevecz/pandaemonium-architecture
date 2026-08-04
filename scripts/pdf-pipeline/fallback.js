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

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { WORK_DIR, loadAllMetadata, findPdfForSlug, pad, pad4 } from './lib/work.js';

// Locate the source PDF for a slug by matching the slugified filename. Lets us
// pull a page's text on demand even for classes (notes-heavy/scanned) that
// skipped the pdftotext extract step — so a Gemini RECITATION block on a page
// that DOES have a text layer becomes real text, not a blank placeholder.
// findPdfForSlug walks PDFs/ recursively and slugifies the path relative to
// PDFs/, which is what lib/slug.js expects: the old flat readdirSync +
// local slugify never saw additional_reading_primary_documents/, so every
// additional reading matched nothing and was guaranteed a placeholder.
function pdftextForPage(pdfPath, page) {
	if (!pdfPath) return '';
	try {
		return execSync(`pdftotext -layout -f ${page} -l ${page} -enc UTF-8 "${pdfPath}" -`, {
			encoding: 'utf-8',
			maxBuffer: 8 * 1024 * 1024
		});
	} catch {
		return '';
	}
}

// Last resort before a placeholder: local OCR of the rendered page. This is
// the spec's Stage 3 "scanned" route (PDF_PIPELINE.md), which never got built.
// It matters for pages that have no text layer at all AND that the hosted VLM
// declines to transcribe — previously those shipped as a blank placeholder.
// Runs entirely offline against a page we already rendered.
function ocrPage(slugDir, page) {
	const pagesDir = join(slugDir, 'pages');
	if (!existsSync(pagesDir)) return '';
	// pdftoppm pads page numbers to the width of the total page count, so the
	// filename can be page-6, page-06 or page-006. Match on the number.
	const file = readdirSync(pagesDir).find((f) => {
		const m = f.match(/^page-(\d+)\.png$/);
		return m && Number(m[1]) === page;
	});
	if (!file) return '';
	const png = join(pagesDir, file);
	try {
		// `-` writes to stdout; psm 1 = auto page segmentation with orientation
		// detection, which handles rotated scans.
		return execSync(`tesseract "${png}" - --psm 1 2>/dev/null`, {
			encoding: 'utf-8',
			maxBuffer: 8 * 1024 * 1024
		});
	} catch {
		return '';
	}
}

// Scanner rules, page edges and speckle come back from OCR as runs of dashes
// and stray glyphs ("-- — —_——— eee"). Drop paragraphs that are mostly not
// letters; real prose never is. Only applied to OCR output — pdftotext output
// is clean and a filter there would risk eating legitimate lines.
function dropOcrNoise(text) {
	return text
		.split('\n\n')
		.filter((p) => {
			const letters = (p.match(/[a-zA-Z0-9]/g) ?? []).length;
			return p.trim().length < 12 ? false : letters / p.length >= 0.5;
		})
		.join('\n\n');
}

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

	const counts = { existing: 0, fromRaw: 0, fromPdf: 0, fromOcr: 0, placeholder: 0 };
	const pdfPath = findPdfForSlug(meta.slug);
	for (let p = 1; p <= meta.pages; p++) {
		const vlmPath = join(vlmDir, `page_${pad4(p)}.md`);
		if (existsSync(vlmPath)) { counts.existing++; continue; }
		const rawPath = join(slugDir, `raw/page_${pad4(p)}.txt`);
		if (existsSync(rawPath)) {
			const raw = readFileSync(rawPath, 'utf-8');
			writeFileSync(vlmPath, rawTextToMarkdown(raw) + '\n');
			counts.fromRaw++;
			continue;
		}
		// No pre-extracted raw (notes-heavy/scanned skip extract). Try pulling
		// this page's text layer directly from the PDF before giving up — a
		// RECITATION block on a page that has real text shouldn't go blank.
		const onDemand = pdftextForPage(pdfPath, p);
		if (onDemand.replace(/\s/g, '').length >= 40) {
			writeFileSync(vlmPath, rawTextToMarkdown(onDemand) + '\n');
			counts.fromPdf++;
			continue;
		}
		// No text layer either — the page is a pure image. OCR it locally
		// rather than shipping a blank page to the reader.
		const ocr = ocrPage(slugDir, p);
		if (ocr.replace(/\s/g, '').length >= 40) {
			writeFileSync(vlmPath, dropOcrNoise(rawTextToMarkdown(ocr)) + '\n');
			counts.fromOcr++;
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

console.log(pad('class', 18) + pad('have', 6) + pad('+raw', 6) + pad('+pdf', 6) + pad('+ocr', 6) + pad('+pl', 5) + 'slug');
console.log('-'.repeat(110));
for (const meta of targets) {
	const c = fillSlug(meta);
	if (c.fromRaw > 0 || c.fromPdf > 0 || c.fromOcr > 0 || c.placeholder > 0) {
		console.log(pad(meta.classification, 18) + pad(c.existing, 6) + pad(c.fromRaw, 6) + pad(c.fromPdf, 6) + pad(c.fromOcr, 6) + pad(c.placeholder, 5) + meta.slug);
	}
}
