#!/usr/bin/env node
// Stage 1 of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Walks PDFs/, runs local-only inspection (pdfinfo, pdftotext samples,
// pdfimages -list), classifies each PDF into one of:
//   - born-digital-clean  → pdftotext path
//   - mixed               → pdftotext per page, OCR fallback per scanned page
//   - scanned             → tesseract path
//   - notes-heavy         → image-only path through Claude
// and decides chunking + image-only-fallback up front.
//
// Outputs:
//   work/<slug>/metadata.json  — per PDF
//   work/triage-summary.json   — all PDFs in one file
// Also prints a summary table to stdout.

import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { slugify } from './lib/slug.js';
import { ROOT, WORK_DIR, pad, fmtBytes } from './lib/work.js';

const PDFS_DIR = join(ROOT, 'PDFs');
const ADDITIONAL_SUBDIR = 'additional_reading_primary_documents';

// --- Tunables (mirror PDF_PIPELINE.md) -------------------------------------
const SAMPLE_PAGE_COUNT = 5;          // pages to sample for text-layer check
const PAGES_PER_CHUNK = 20;
const CHUNK_OVERLAP = 2;
const IMAGE_ONLY_FALLBACK_BYTES = 25 * 1024 * 1024;   // 25MB
const SCANNED_AVG_CHARS_THRESHOLD = 50;
const MIXED_AVG_CHARS_THRESHOLD = 400;
const MIXED_PAGE_DROPOUT_RATIO = 0.3; // share of sampled pages with <200 chars
const NOTES_HEAVY_IMAGES_PER_PAGE = 1.5;
// Secondary rule: PDFs with sparse text and a meaningful image rate are
// notes-heavy even if the text layer technically exists. Catches the Benzel
// "Notes on…" PDFs (avg 500–1100 chars, ~0.6–1.0 images per page).
const NOTES_HEAVY_SECONDARY_IMG_PER_PAGE = 0.6;
const NOTES_HEAVY_SECONDARY_AVG_CHARS = 1200;

// --- Helpers ---------------------------------------------------------------

function findPdfs() {
	const out = [];
	for (const entry of readdirSync(PDFS_DIR)) {
		const full = join(PDFS_DIR, entry);
		const st = statSync(full);
		if (st.isFile() && entry.toLowerCase().endsWith('.pdf')) {
			out.push({ path: full, filename: entry, subdir: null });
		} else if (st.isDirectory() && entry === ADDITIONAL_SUBDIR) {
			for (const sub of readdirSync(full)) {
				if (sub.toLowerCase().endsWith('.pdf')) {
					out.push({ path: join(full, sub), filename: sub, subdir: entry });
				}
			}
		}
	}
	return out.sort((a, b) => a.filename.localeCompare(b.filename));
}

function runPdfInfo(path) {
	const raw = execFileSync('pdfinfo', [path], { encoding: 'utf-8' });
	const info = {};
	for (const line of raw.split('\n')) {
		const idx = line.indexOf(':');
		if (idx === -1) continue;
		info[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return {
		pages: info.Pages ? Number(info.Pages) : null,
		pdfVersion: info['PDF version'] ?? null,
		encrypted: info.Encrypted && !info.Encrypted.startsWith('no'),
		optimized: info.Optimized === 'yes',
		pageSize: info['Page size'] ?? null
	};
}

function pickSamplePages(totalPages, n) {
	if (totalPages <= n) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	// First, last, and (n-2) evenly spaced interior pages.
	const out = new Set([1, totalPages]);
	const interior = n - 2;
	for (let i = 1; i <= interior; i++) {
		const p = Math.round(((i) * totalPages) / (interior + 1));
		out.add(Math.max(1, Math.min(totalPages, p)));
	}
	return [...out].sort((a, b) => a - b);
}

function letterRatio(s) {
	if (!s.length) return 0;
	let letters = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) letters++;
	}
	return letters / s.length;
}

function sampleTextLayer(path, samplePages) {
	const charsPerPage = {};
	const letterRatioPerPage = {};
	for (const p of samplePages) {
		let out = '';
		try {
			out = execFileSync('pdftotext', ['-f', String(p), '-l', String(p), path, '-'], {
				encoding: 'utf-8',
				maxBuffer: 4 * 1024 * 1024
			});
		} catch {}
		charsPerPage[p] = out.length;
		letterRatioPerPage[p] = letterRatio(out);
	}
	const counts = Object.values(charsPerPage);
	const ratios = Object.values(letterRatioPerPage);
	const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
	const min = Math.min(...counts);
	const max = Math.max(...counts);
	const dropoutRatio = counts.filter((c) => c < 200).length / counts.length;
	const sortedRatios = [...ratios].sort((a, b) => a - b);
	const medianRatio = sortedRatios[Math.floor(sortedRatios.length / 2)];
	// Healthy English text layer: 0.75-0.85 letter ratio. Anything <0.5 across
	// the median sample page is almost certainly private-use font encoding —
	// the Barad and Malabou case where pdftotext returns gibberish.
	const usable = medianRatio >= 0.5;
	return {
		sampledPages: samplePages,
		charsPerPage,
		letterRatioPerPage,
		avgCharsPerPage: avg,
		minCharsPerPage: min,
		maxCharsPerPage: max,
		dropoutRatio,
		medianLetterRatio: medianRatio,
		usable
	};
}

function inspectImages(path, totalPages) {
	let raw;
	try {
		raw = execFileSync('pdfimages', ['-list', path], {
			encoding: 'utf-8',
			maxBuffer: 16 * 1024 * 1024
		});
	} catch {
		return { totalEmbedded: 0, perPage: {}, imagesPerPage: 0, largeImagePages: [] };
	}
	const lines = raw.split('\n').slice(2).filter(Boolean); // skip header + ruler
	const perPage = {};
	const largeImagePages = new Set();
	let total = 0;
	for (const line of lines) {
		const cols = line.trim().split(/\s+/);
		// columns: page num type width height color comp bpc enc interp object ID x-ppi y-ppi size ratio
		const page = Number(cols[0]);
		const width = Number(cols[3]);
		const height = Number(cols[4]);
		if (!Number.isFinite(page)) continue;
		total += 1;
		perPage[page] = (perPage[page] ?? 0) + 1;
		if (Number.isFinite(width) && Number.isFinite(height) && width >= 600 && height >= 600) {
			largeImagePages.add(page);
		}
	}
	return {
		totalEmbedded: total,
		perPage,
		imagesPerPage: totalPages ? total / totalPages : 0,
		largeImagePages: [...largeImagePages].sort((a, b) => a - b)
	};
}

function classify({ textLayer, images, fileSizeBytes, pages }) {
	const { avgCharsPerPage, minCharsPerPage, dropoutRatio, usable } = textLayer;
	const { imagesPerPage } = images;

	// Text layer exists but is gibberish (private-use font encoding). Treat
	// the doc as if it had no text layer at all. Use the looser secondary
	// image threshold here — without a usable text layer, even moderate image
	// density signals notes-heavy.
	if (!usable) {
		if (
			imagesPerPage >= NOTES_HEAVY_SECONDARY_IMG_PER_PAGE ||
			fileSizeBytes > IMAGE_ONLY_FALLBACK_BYTES
		) {
			return 'notes-heavy';
		}
		return 'scanned';
	}

	if (avgCharsPerPage < SCANNED_AVG_CHARS_THRESHOLD) {
		// Almost no text layer at all.
		if (imagesPerPage >= NOTES_HEAVY_IMAGES_PER_PAGE || fileSizeBytes > IMAGE_ONLY_FALLBACK_BYTES) {
			return 'notes-heavy';
		}
		return 'scanned';
	}
	// Catches docs with a real text layer but image-dominant pages (Benzel notes).
	if (
		imagesPerPage >= NOTES_HEAVY_SECONDARY_IMG_PER_PAGE &&
		avgCharsPerPage < NOTES_HEAVY_SECONDARY_AVG_CHARS
	) {
		return 'notes-heavy';
	}
	if (avgCharsPerPage < MIXED_AVG_CHARS_THRESHOLD) {
		// Some text but thin — book with many image pages, or partial OCR.
		if (imagesPerPage >= NOTES_HEAVY_IMAGES_PER_PAGE) return 'notes-heavy';
		return 'mixed';
	}
	if (dropoutRatio >= MIXED_PAGE_DROPOUT_RATIO || minCharsPerPage < SCANNED_AVG_CHARS_THRESHOLD) {
		// Healthy avg but specific pages drop out — figures/insets without OCR.
		return 'mixed';
	}
	return 'born-digital-clean';
}

function planChunking({ pages, fileSizeBytes }) {
	const needsChunking = pages > PAGES_PER_CHUNK + CHUNK_OVERLAP;
	const estimatedChunks = Math.max(1, Math.ceil(pages / PAGES_PER_CHUNK));
	const imageOnlyFallback = fileSizeBytes > IMAGE_ONLY_FALLBACK_BYTES;
	const ranges = [];
	if (needsChunking) {
		for (let i = 0; i < estimatedChunks; i++) {
			const startCore = i * PAGES_PER_CHUNK + 1;
			const endCore = Math.min(pages, (i + 1) * PAGES_PER_CHUNK);
			const start = Math.max(1, startCore - (i === 0 ? 0 : CHUNK_OVERLAP));
			const end = Math.min(pages, endCore + (i === estimatedChunks - 1 ? 0 : CHUNK_OVERLAP));
			ranges.push({ index: i + 1, startPage: start, endPage: end, corePages: [startCore, endCore] });
		}
	} else {
		ranges.push({ index: 1, startPage: 1, endPage: pages, corePages: [1, pages] });
	}
	return { needsChunking, estimatedChunks, imageOnlyFallback, ranges };
}

function warningsFor(meta) {
	const w = [];
	// Only warn about encryption if it actually blocked text extraction.
	// Most "encrypted" PDFs in this corpus just have copy/print restrictions
	// and poppler reads them fine.
	if (meta.encrypted && meta.textLayer.maxCharsPerPage === 0) {
		w.push('PDF is encrypted and unreadable — needs qpdf --decrypt preprocess.');
	}
	if (meta.fileSizeBytes > IMAGE_ONLY_FALLBACK_BYTES) {
		w.push(`File >${IMAGE_ONLY_FALLBACK_BYTES / 1024 / 1024}MB — will use image-only Claude path.`);
	}
	if (meta.classification === 'scanned' && meta.images.totalEmbedded === 0) {
		w.push('Classified scanned but no embedded images detected — investigate.');
	}
	if (meta.pages > 100) w.push('Pages >100 — definitely needs chunking even on native PDF input.');
	return w;
}

// --- Main ------------------------------------------------------------------

function triagePdf({ path, filename, subdir }) {
	const slug = slugify(subdir ? `${subdir}/${filename}` : filename);
	const fileSizeBytes = statSync(path).size;
	const info = runPdfInfo(path);
	const samplePages = pickSamplePages(info.pages ?? 1, SAMPLE_PAGE_COUNT);
	const textLayer = sampleTextLayer(path, samplePages);
	const images = inspectImages(path, info.pages ?? 0);
	const meta = {
		slug,
		filename,
		path: subdir ? `PDFs/${subdir}/${filename}` : `PDFs/${filename}`,
		subdir,
		fileSizeBytes,
		pages: info.pages,
		pdfVersion: info.pdfVersion,
		encrypted: info.encrypted,
		optimized: info.optimized,
		pageSize: info.pageSize,
		textLayer,
		images,
		classification: null,
		chunking: null,
		warnings: []
	};
	meta.classification = classify({ textLayer, images, fileSizeBytes, pages: info.pages });
	meta.chunking = planChunking({ pages: info.pages, fileSizeBytes });
	meta.warnings = warningsFor(meta);

	const slugDir = join(WORK_DIR, slug);
	mkdirSync(slugDir, { recursive: true });
	writeFileSync(join(slugDir, 'metadata.json'), JSON.stringify(meta, null, 2));
	return meta;
}

function main() {
	if (!existsSync(PDFS_DIR)) {
		console.error(`No PDFs/ dir at ${PDFS_DIR}`);
		process.exit(1);
	}
	mkdirSync(WORK_DIR, { recursive: true });
	const pdfs = findPdfs();
	console.error(`Triaging ${pdfs.length} PDFs…`);
	const all = [];
	for (const pdf of pdfs) {
		try {
			const meta = triagePdf(pdf);
			all.push(meta);
			process.stderr.write('.');
		} catch (err) {
			console.error(`\n[error] ${pdf.filename}: ${err.message}`);
			all.push({ slug: slugify(pdf.subdir ? `${pdf.subdir}/${pdf.filename}` : pdf.filename), filename: pdf.filename, error: err.message });
		}
	}
	process.stderr.write('\n');

	writeFileSync(
		join(WORK_DIR, 'triage-summary.json'),
		JSON.stringify({ generatedAt: new Date().toISOString(), count: all.length, pdfs: all }, null, 2)
	);

	// Stdout table.
	const counts = { 'born-digital-clean': 0, mixed: 0, scanned: 0, 'notes-heavy': 0 };
	console.log(
		pad('class', 20) + pad('pages', 6) + pad('size', 8) + pad('avgCh', 7) + pad('minCh', 7) + pad('img/p', 7) + pad('chnk', 5) + pad('fbk', 4) + pad('w', 3) + 'filename'
	);
	console.log('-'.repeat(125));
	for (const m of all.sort((a, b) => (a.classification ?? 'zzz').localeCompare(b.classification ?? 'zzz'))) {
		if (m.error) {
			console.log(pad('ERROR', 20) + ' '.repeat(40) + m.filename + '  — ' + m.error);
			continue;
		}
		counts[m.classification] = (counts[m.classification] ?? 0) + 1;
		console.log(
			pad(m.classification, 20) +
				pad(m.pages, 6) +
				pad(fmtBytes(m.fileSizeBytes), 8) +
				pad(Math.round(m.textLayer.avgCharsPerPage), 7) +
				pad(m.textLayer.minCharsPerPage, 7) +
				pad(m.images.imagesPerPage.toFixed(1), 7) +
				pad(m.chunking.estimatedChunks, 5) +
				pad(m.chunking.imageOnlyFallback ? 'IMG' : '', 4) +
				pad(m.warnings.length || '', 3) +
				m.filename
		);
	}
	console.log('-'.repeat(125));
	console.log(`totals: ${JSON.stringify(counts)}`);
	console.log(`\nWrote work/triage-summary.json and ${all.length} per-PDF metadata.json files.`);
}

main();
