#!/usr/bin/env node
// Stage 2 of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Renders each page of a PDF to a PNG under work/<slug>/pages/. Stage 3
// (extract) and Stage 4 (VLM) both read these. We render once and store the
// filenames in work/<slug>/render.json; downstream consumes the manifest, so
// pdftoppm's auto-padding scheme doesn't have to be guessed at.
//
// Usage:
//   node scripts/pdf-pipeline/render.js <slug>           render one PDF
//   node scripts/pdf-pipeline/render.js --all            render every triaged PDF
//   node scripts/pdf-pipeline/render.js --class=notes-heavy   render by classification
//   node scripts/pdf-pipeline/render.js --force <slug>   re-render even if cached
//
// DPI defaults: 200 for born-digital, 300 for scanned/notes-heavy/mixed.

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { ROOT, WORK_DIR, loadAllMetadata, parseStageArgs, selectTargets, pad, fmtBytes } from './lib/work.js';

const DPI_BY_CLASS = {
	'born-digital-clean': 200,
	mixed: 250,
	scanned: 300,
	'notes-heavy': 300
};

function renderOne(meta, { force }) {
	const slugDir = join(WORK_DIR, meta.slug);
	const pagesDir = join(slugDir, 'pages');
	const manifestPath = join(slugDir, 'render.json');
	const sourcePath = join(ROOT, meta.path);

	if (!existsSync(sourcePath)) {
		throw new Error(`Source PDF not found at ${sourcePath}`);
	}

	const dpi = DPI_BY_CLASS[meta.classification] ?? 200;

	if (existsSync(manifestPath) && !force) {
		const cached = JSON.parse(readFileSync(manifestPath, 'utf-8'));
		if (cached.pageCount === meta.pages && cached.dpi === dpi) {
			return { ...cached, cached: true };
		}
	}

	if (existsSync(pagesDir)) rmSync(pagesDir, { recursive: true });
	mkdirSync(pagesDir, { recursive: true });

	// pdftoppm pads page numbers based on the doc's total page count, so a
	// 230-page doc produces page-001.png and a 9-page doc produces page-1.png.
	// We don't fight it — we just record the produced filenames in the manifest.
	const prefix = join(pagesDir, 'page');
	execFileSync('pdftoppm', ['-png', '-r', String(dpi), sourcePath, prefix], {
		stdio: ['ignore', 'ignore', 'inherit']
	});

	const produced = readdirSync(pagesDir)
		.filter((f) => f.startsWith('page-') && f.endsWith('.png'))
		.sort();

	const pages = produced.map((file) => {
		const m = file.match(/^page-(\d+)\.png$/);
		const page = m ? Number(m[1]) : null;
		const sizeBytes = statSync(join(pagesDir, file)).size;
		return { page, file: `pages/${file}`, sizeBytes };
	});

	if (meta.pages != null && pages.length !== meta.pages) {
		console.error(
			`[warn] ${meta.slug}: expected ${meta.pages} pages, rendered ${pages.length}`
		);
	}

	const manifest = {
		slug: meta.slug,
		generatedAt: new Date().toISOString(),
		dpi,
		pageCount: pages.length,
		totalBytes: pages.reduce((a, p) => a + p.sizeBytes, 0),
		pages
	};
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
	return { ...manifest, cached: false };
}

// --- Main ------------------------------------------------------------------

const args = parseStageArgs(process.argv.slice(2));
const allMeta = loadAllMetadata();
const targets = selectTargets(args, allMeta);

console.log(pad('class', 18) + pad('pages', 6) + pad('dpi', 5) + pad('size', 8) + pad('cache', 7) + 'slug');
console.log('-'.repeat(110));

let totalBytes = 0;
let totalPages = 0;
for (const meta of targets) {
	try {
		const r = renderOne(meta, { force: args.force });
		totalBytes += r.totalBytes;
		totalPages += r.pageCount;
		console.log(
			pad(meta.classification, 18) +
				pad(r.pageCount, 6) +
				pad(r.dpi, 5) +
				pad(fmtBytes(r.totalBytes), 8) +
				pad(r.cached ? 'hit' : 'fresh', 7) +
				meta.slug
		);
	} catch (err) {
		console.log(pad('ERROR', 18) + ' '.repeat(26) + meta.slug + '  — ' + err.message);
	}
}
console.log('-'.repeat(110));
console.log(`rendered ${totalPages} pages, ${fmtBytes(totalBytes)} total across ${targets.length} PDFs`);
