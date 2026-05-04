#!/usr/bin/env node
// Stage 3 of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Per-page raw text extraction. The path is picked from triage classification:
//   - born-digital-clean / mixed → pdftotext -layout per page
//   - notes-heavy                → skipped (image-only goes straight to Stage 4)
//   - scanned                    → tesseract per page (TODO: not yet implemented;
//                                   no scanned PDFs in current corpus)
//
// On `mixed`, pages with < 200 chars from pdftotext fall back to tesseract.
// (Also TODO until we have a scanned PDF to validate against.)
//
// Outputs:
//   work/<slug>/raw/page_NNNN.txt    one per page (zero-padded to 4 digits)
//   work/<slug>/extract.json         manifest with per-page char counts + path
//
// Usage matches render.js: <slug> | --all | --class=… [--force]

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { ROOT, WORK_DIR, loadAllMetadata, parseStageArgs, selectTargets, pad, pad4 } from './lib/work.js';

function pdftotextPage(sourcePath, pageNum) {
	return execFileSync(
		'pdftotext',
		['-layout', '-nopgbrk', '-enc', 'UTF-8', '-f', String(pageNum), '-l', String(pageNum), sourcePath, '-'],
		{ encoding: 'utf-8', maxBuffer: 4 * 1024 * 1024 }
	);
}

function extractOne(meta, { force }) {
	const slugDir = join(WORK_DIR, meta.slug);
	const rawDir = join(slugDir, 'raw');
	const manifestPath = join(slugDir, 'extract.json');
	const sourcePath = join(ROOT, meta.path);

	if (meta.classification === 'notes-heavy' || meta.classification === 'scanned') {
		// Image-only path through Claude in Stage 4. No raw extraction.
		// (Both classes share the same downstream path; "scanned" includes
		// born-digital PDFs whose text layer is gibberish — see triage.js
		// usable check.) Wipe any stale raw/ from a prior classification.
		if (existsSync(rawDir)) rmSync(rawDir, { recursive: true });
		const manifest = {
			slug: meta.slug,
			generatedAt: new Date().toISOString(),
			method: `skipped-${meta.classification}`,
			pageCount: meta.pages,
			pages: []
		};
		writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
		return { ...manifest, cached: false };
	}

	if (existsSync(manifestPath) && !force) {
		const cached = JSON.parse(readFileSync(manifestPath, 'utf-8'));
		if (cached.pageCount === meta.pages) return { ...cached, cached: true };
	}

	if (existsSync(rawDir)) rmSync(rawDir, { recursive: true });
	mkdirSync(rawDir, { recursive: true });

	const pages = [];
	let fallbackCount = 0;
	for (let p = 1; p <= meta.pages; p++) {
		let text = pdftotextPage(sourcePath, p);
		let method = 'pdftotext';
		if (meta.classification === 'mixed' && text.replace(/\s/g, '').length < 200) {
			// TODO: tesseract fallback. For now record that the page is suspect.
			method = 'pdftotext-thin';
			fallbackCount++;
		}
		const file = `raw/page_${pad4(p)}.txt`;
		writeFileSync(join(slugDir, file), text);
		pages.push({ page: p, file, chars: text.length, method });
	}

	const manifest = {
		slug: meta.slug,
		generatedAt: new Date().toISOString(),
		method: 'pdftotext-per-page',
		pageCount: pages.length,
		totalChars: pages.reduce((a, p) => a + p.chars, 0),
		thinPages: fallbackCount,
		pages
	};
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
	return { ...manifest, cached: false };
}

const args = parseStageArgs(process.argv.slice(2));
const allMeta = loadAllMetadata();
const targets = selectTargets(args, allMeta);

console.log(pad('class', 18) + pad('pages', 6) + pad('chars', 9) + pad('thin', 6) + pad('cache', 7) + 'slug');
console.log('-'.repeat(110));
for (const meta of targets) {
	try {
		const r = extractOne(meta, { force: args.force });
		console.log(
			pad(meta.classification, 18) +
				pad(r.pageCount ?? 0, 6) +
				pad(r.totalChars ?? '-', 9) +
				pad(r.thinPages ?? 0, 6) +
				pad(r.cached ? 'hit' : 'fresh', 7) +
				meta.slug
		);
	} catch (err) {
		console.log(pad('ERROR', 18) + ' '.repeat(28) + meta.slug + '  — ' + err.message);
	}
}
