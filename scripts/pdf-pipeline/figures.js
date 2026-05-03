#!/usr/bin/env node
// Stage 5b of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Extracts embedded images from each PDF using pdfimages, drops obvious
// hairline/placeholder objects, and stages them under static/figures/<slug>/
// so SvelteKit serves them at /figures/<slug>/pN-i.<ext>. Writes a manifest
// at work/<slug>/figures.json that reconcile.js consumes to swap text-only
// figure markers for real <img> tags.
//
// Outputs:
//   static/figures/<slug>/pN-iI.<ext>     image files served by the app
//   work/<slug>/figures.json              manifest: { perPage: { N: [{file, ext, width, height}] } }
//
// Usage:
//   node scripts/pdf-pipeline/figures.js <slug>
//   node scripts/pdf-pipeline/figures.js --all
//   node scripts/pdf-pipeline/figures.js <slug> --force

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const WORK_DIR = join(ROOT, 'work');
const STATIC_FIGURES = join(ROOT, 'static', 'figures');
const MIN_DIMENSION = 50; // drop hairlines, color profiles, page rules

function loadAllMetadata() {
	const out = [];
	for (const slug of readdirSync(WORK_DIR)) {
		const metaPath = join(WORK_DIR, slug, 'metadata.json');
		if (!existsSync(metaPath)) continue;
		try { out.push(JSON.parse(readFileSync(metaPath, 'utf-8'))); } catch {}
	}
	return out;
}

function parseArgs(argv) {
	const args = { all: false, slug: null, force: false };
	for (const a of argv) {
		if (a === '--all') args.all = true;
		else if (a === '--force') args.force = true;
		else if (!args.slug) args.slug = a;
		else { console.error(`Unexpected arg: ${a}`); process.exit(2); }
	}
	return args;
}

function selectTargets(args, allMeta) {
	if (args.all) return allMeta;
	if (!args.slug) { console.error('Pass <slug> or --all.'); process.exit(2); }
	const exact = allMeta.find((m) => m.slug === args.slug);
	if (exact) return [exact];
	const prefix = allMeta.filter((m) => m.slug.startsWith(args.slug));
	if (prefix.length === 1) return prefix;
	if (prefix.length === 0) { console.error(`No PDF matches "${args.slug}".`); process.exit(1); }
	console.error(`Slug "${args.slug}" is ambiguous:`);
	for (const m of prefix) console.error(`  ${m.slug}`);
	process.exit(1);
}

// Read PNG IHDR / JPEG SOFn to get dimensions without loading a real decoder.
function dimensionsOf(path) {
	const buf = readFileSync(path);
	if (buf.length < 24) return null;
	// PNG: 89 50 4E 47 ... IHDR at offset 16
	if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
		return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
	}
	// JPEG: scan for SOFn marker
	if (buf[0] === 0xff && buf[1] === 0xd8) {
		let i = 2;
		while (i < buf.length - 9) {
			if (buf[i] !== 0xff) { i++; continue; }
			const marker = buf[i + 1];
			if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
				return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
			}
			const segLen = buf.readUInt16BE(i + 2);
			i += 2 + segLen;
		}
	}
	return null;
}

function extractFigures(meta, { force }) {
	const slugDir = join(WORK_DIR, meta.slug);
	const tmpDir = join(slugDir, 'figures-raw');
	const manifestPath = join(slugDir, 'figures.json');
	const sourcePath = join(ROOT, meta.path);
	const destDir = join(STATIC_FIGURES, meta.slug);

	if (existsSync(manifestPath) && !force) {
		const cached = JSON.parse(readFileSync(manifestPath, 'utf-8'));
		return { ...cached, cached: true };
	}

	if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
	if (existsSync(destDir)) rmSync(destDir, { recursive: true });
	mkdirSync(tmpDir, { recursive: true });
	mkdirSync(destDir, { recursive: true });

	// pdfimages writes prefix-PPP-NNN.<ext> when -p is set. -all picks the
	// best output format per image (png/jpg/jp2/jbig2/ccitt -> tiff).
	try {
		execFileSync('pdfimages', ['-all', '-p', sourcePath, join(tmpDir, 'img')], {
			stdio: ['ignore', 'ignore', 'inherit']
		});
	} catch (err) {
		// Some PDFs fail (encrypted-ish, malformed). Treat as "no figures".
		console.error(`  [warn] pdfimages failed for ${meta.slug}: ${err.message}`);
	}

	const produced = existsSync(tmpDir) ? readdirSync(tmpDir).sort() : [];
	const perPage = {};
	const skipped = { tooSmall: 0, parseFailed: 0 };

	for (const file of produced) {
		const m = file.match(/^img-(\d+)-(\d+)\.([a-z0-9]+)$/i);
		if (!m) { skipped.parseFailed++; continue; }
		const page = Number(m[1]);
		const ext = m[3].toLowerCase();
		const srcPath = join(tmpDir, file);
		const dim = dimensionsOf(srcPath);
		if (!dim) { skipped.parseFailed++; continue; }
		if (dim.width < MIN_DIMENSION || dim.height < MIN_DIMENSION) {
			skipped.tooSmall++;
			continue;
		}
		perPage[page] = perPage[page] ?? [];
		const idx = perPage[page].length + 1;
		const outName = `p${page}-i${idx}.${ext === 'jpeg' ? 'jpg' : ext}`;
		copyFileSync(srcPath, join(destDir, outName));
		perPage[page].push({
			file: outName,
			urlPath: `/figures/${meta.slug}/${outName}`,
			width: dim.width,
			height: dim.height,
			bytes: statSync(srcPath).size
		});
	}

	rmSync(tmpDir, { recursive: true });

	const manifest = {
		slug: meta.slug,
		generatedAt: new Date().toISOString(),
		totalFigures: Object.values(perPage).reduce((a, b) => a + b.length, 0),
		pagesWithFigures: Object.keys(perPage).length,
		skipped,
		perPage
	};
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
	return { ...manifest, cached: false };
}

function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }

const args = parseArgs(process.argv.slice(2));
const allMeta = loadAllMetadata();
const targets = selectTargets(args, allMeta);

console.log(pad('figures', 9) + pad('pages', 7) + pad('skip', 6) + pad('cache', 7) + 'slug');
console.log('-'.repeat(110));
for (const meta of targets) {
	try {
		const r = extractFigures(meta, { force: args.force });
		const skipTotal = (r.skipped.tooSmall ?? 0) + (r.skipped.parseFailed ?? 0);
		console.log(
			pad(r.totalFigures, 9) +
				pad(r.pagesWithFigures, 7) +
				pad(skipTotal, 6) +
				pad(r.cached ? 'hit' : 'fresh', 7) +
				meta.slug
		);
	} catch (err) {
		console.log(pad('ERR', 9) + ' '.repeat(20) + meta.slug + '  — ' + err.message);
	}
}
