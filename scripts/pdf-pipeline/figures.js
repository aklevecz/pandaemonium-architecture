#!/usr/bin/env node
// Stage 5b of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Extracts embedded images from each PDF using pdfimages, drops obvious
// hairline/placeholder objects, and stages them under work/<slug>/figures/
// (all gitignored). scripts/upload-figures.sh reads from there to push to
// R2; the markdown links straight to the R2 public URL. We deliberately
// don't write to static/ — that ships in every Worker deploy, which would
// duplicate ~225MB of figures Cloudflare assets already serve via R2.
//
// Outputs:
//   work/<slug>/figures/pN-iI.<ext>      raw image files (uploaded to R2)
//   work/<slug>/figures.json             manifest: { perPage: { N: [{file, urlPath, width, height}] } }
//   urlPath in the manifest already encodes the public R2 URL so reconcile
//   can substitute it directly.
//
// Usage:
//   node scripts/pdf-pipeline/figures.js <slug>
//   node scripts/pdf-pipeline/figures.js --all
//   node scripts/pdf-pipeline/figures.js <slug> --force

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { ROOT, WORK_DIR, loadAllMetadata, parseStageArgs, selectTargets, pad } from './lib/work.js';

const R2_PUBLIC_BASE = 'https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/figures';
const MIN_DIMENSION = 50; // drop hairlines, color profiles, page rules

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
	const destDir = join(slugDir, 'figures');

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
			urlPath: `${R2_PUBLIC_BASE}/${meta.slug}/${outName}`,
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

const args = parseStageArgs(process.argv.slice(2));
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
