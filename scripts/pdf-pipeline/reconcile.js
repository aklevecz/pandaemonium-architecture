#!/usr/bin/env node
// Stage 5 of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Stitches per-page VLM markdown into one document and writes it to
// markdown/<filename>.md.new (plus a .stats.json with diff counts vs the
// existing markdown). The .new suffix is intentional — we don't overwrite
// existing markdown until a human eyeballs the diff.
//
// What it does:
//   1. Concatenate work/<slug>/vlm/page_NNNN.md in page order.
//   2. Lift footnote bodies. Each page output ends with an optional fenced
//      footnote section (`---` then `[^N]: …`). When bodies are present,
//      collect them and emit a single document-end "## Notes" section. When
//      a page only has empty `[^N]:` lines (the body lives elsewhere in the
//      book), strip the empty trailer.
//   3. Drop residual running headers and standalone page numbers if any
//      slipped past the VLM pass.
//   4. Normalize whitespace: collapse 3+ blank lines to 2.
//
// Outputs:
//   markdown/<filename>.md.new
//   work/<slug>/reconcile.json    diff/stats vs existing markdown/<filename>.md
//
// Usage:
//   node scripts/pdf-pipeline/reconcile.js <slug>
//   node scripts/pdf-pipeline/reconcile.js --all

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ROOT, WORK_DIR, loadAllMetadata, parseStageArgs, selectTargets, pad } from './lib/work.js';

const MARKDOWN_DIR = join(ROOT, 'markdown');

// --- Per-page parse --------------------------------------------------------

// Each page's VLM output may end with a trailing footnote section that looks like:
//   ...body markdown...
//
//   ---
//   [^22]: footnote body
//   [^23]: ...
//
// (The `---` is required, on its own line, immediately preceded by a blank.)
// Returns { body, footnotes: [{ marker, text }] }.
function splitPageFootnotes(md) {
	const lines = md.split('\n');
	// Find the last `---` divider that is followed only by [^N]: lines and
	// blank lines until end-of-file.
	let dividerIdx = -1;
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].trim() !== '---') continue;
		const after = lines.slice(i + 1);
		const nonBlank = after.filter((l) => l.trim().length);
		if (nonBlank.length === 0) continue; // pure trailing divider
		const allFootnotes = nonBlank.every((l) => /^\[\^[^\]]+\]:/.test(l.trim()));
		if (allFootnotes) { dividerIdx = i; break; }
	}
	if (dividerIdx === -1) return { body: md.trimEnd(), footnotes: [] };

	const body = lines.slice(0, dividerIdx).join('\n').trimEnd();
	const footnoteLines = lines.slice(dividerIdx + 1).join('\n');
	const footnotes = [];
	// Split into individual footnote entries (one per [^N]: marker)
	const regex = /^\[\^([^\]]+)\]:(.*)$/gm;
	let m;
	let lastIndex = 0;
	const entries = [];
	while ((m = regex.exec(footnoteLines)) !== null) {
		entries.push({ start: m.index, marker: m[1], firstLine: m[2] });
	}
	for (let i = 0; i < entries.length; i++) {
		const e = entries[i];
		const next = entries[i + 1];
		const block = footnoteLines.slice(e.start, next ? next.start : undefined);
		const text = block.replace(/^\[\^[^\]]+\]:\s*/, '').trim();
		footnotes.push({ marker: e.marker, text });
	}
	return { body, footnotes };
}

// --- Cleanup heuristics ----------------------------------------------------

function stripResidualRunningHeaders(text) {
	// VLM should drop these but we belt-and-brace. A standalone all-caps line
	// of <50 chars surrounded by blanks is almost always a running header.
	return text.replace(/(\n\n)([A-Z][A-Z\s.,'·:&-]{2,49})\n\n/g, (full, before, line) => {
		// keep it if it has any lowercase letters (then it's not a header) or
		// digits (page numbers handled separately)
		if (/[a-z]/.test(line)) return full;
		return before;
	});
}

function stripStandalonePageNumbers(text) {
	// "144" alone on a line, surrounded by blanks → drop.
	return text.replace(/(\n\n)\d{1,4}\n(?=\n)/g, '$1');
}

function collapseBlankLines(text) {
	return text.replace(/\n{3,}/g, '\n\n');
}

// VLM emits `![Figure: alt](#fig-pN-i)` for layout reasons. If we extracted
// real images for this page, substitute their URLs in order; otherwise fall
// back to a non-image bold marker so the reader doesn't render a broken <img>.
function rewriteFigureMarkers(text, figuresForPage) {
	const queue = [...(figuresForPage ?? [])];
	return text.replace(/^!\[Figure:\s*(.+?)\]\([^)]*\)$/gm, (_, alt) => {
		const fig = queue.shift();
		return fig ? `![${alt}](${fig.urlPath})` : `**[Figure: ${alt}]**`;
	});
}

// Multi-line book/chapter titles render as one `#`/`##` per line because the
// title spans several visual lines. Fold runs of same-level adjacent headings
// into one heading, joining text with a space.
function mergeAdjacentHeadings(text) {
	const lines = text.split('\n');
	const out = [];
	let i = 0;
	while (i < lines.length) {
		const m = lines[i].match(/^(#{1,6})\s+(.*\S)\s*$/);
		if (!m) { out.push(lines[i]); i++; continue; }
		const level = m[1];
		const parts = [m[2]];
		let j = i + 1;
		while (j < lines.length) {
			const m2 = lines[j].match(/^(#{1,6})\s+(.*\S)\s*$/);
			if (!m2 || m2[1] !== level) break;
			parts.push(m2[2]);
			j++;
		}
		// Join, then strip trailing colon-then-noise artifacts
		out.push(`${level} ${parts.join(' ')}`);
		i = j;
	}
	return out.join('\n');
}

// --- Reconcile one slug ----------------------------------------------------

function reconcileOne(meta) {
	const slugDir = join(WORK_DIR, meta.slug);
	const vlmDir = join(slugDir, 'vlm');
	if (!existsSync(vlmDir)) {
		throw new Error(`No vlm/ dir — run vlm.js for ${meta.slug} first.`);
	}
	const pageFiles = readdirSync(vlmDir)
		.filter((f) => /^page_\d{4}\.md$/.test(f))
		.sort();
	if (pageFiles.length === 0) throw new Error('No vlm/page_*.md files.');

	const figuresPath = join(slugDir, 'figures.json');
	const figures = existsSync(figuresPath)
		? JSON.parse(readFileSync(figuresPath, 'utf-8'))
		: { perPage: {} };

	const bodies = [];
	const allFootnotes = [];
	const seenMarkers = new Set();
	let pagesWithFootnotes = 0;
	let footnoteBodiesLifted = 0;
	let figuresInjected = 0;

	for (const file of pageFiles) {
		const m = file.match(/^page_(\d{4})\.md$/);
		const pageNum = Number(m[1]);
		const raw = readFileSync(join(vlmDir, file), 'utf-8');
		const { body, footnotes } = splitPageFootnotes(raw);
		const figuresForPage = figures.perPage?.[pageNum] ?? figures.perPage?.[String(pageNum)] ?? [];
		const bodyWithFigures = rewriteFigureMarkers(body, figuresForPage);
		if (bodyWithFigures !== body) figuresInjected++;
		bodies.push(bodyWithFigures);
		const nonEmpty = footnotes.filter((f) => f.text.length);
		if (nonEmpty.length) pagesWithFootnotes++;
		for (const f of nonEmpty) {
			if (seenMarkers.has(f.marker)) continue;
			seenMarkers.add(f.marker);
			allFootnotes.push({ ...f, page: pageNum });
			footnoteBodiesLifted++;
		}
	}

	let combined = bodies.join('\n\n');
	combined = stripResidualRunningHeaders(combined);
	combined = stripStandalonePageNumbers(combined);
	combined = collapseBlankLines(combined);
	combined = mergeAdjacentHeadings(combined);
	// Any remaining `![Figure: …](#fig-…)` (no extracted image) becomes a text marker.
	combined = combined.replace(/^!\[Figure:\s*(.+?)\]\(#[^)]*\)$/gm, '**[Figure: $1]**');
	combined = combined.trim() + '\n';

	if (allFootnotes.length) {
		// Sort numerically when markers are numeric, else alpha.
		allFootnotes.sort((a, b) => {
			const an = Number(a.marker), bn = Number(b.marker);
			if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
			return a.marker.localeCompare(b.marker);
		});
		const notes = '\n## Notes\n\n' + allFootnotes.map((f) => `[^${f.marker}]: ${f.text}`).join('\n\n') + '\n';
		combined += notes;
	}

	// Write .new alongside the canonical name (matches the existing .md filename if any).
	const filenameMd = meta.filename.replace(/\.pdf$/i, '.md');
	const subdir = meta.subdir ?? '';
	const destDir = subdir ? join(MARKDOWN_DIR, subdir) : MARKDOWN_DIR;
	const destPath = join(destDir, filenameMd + '.new');
	writeFileSync(destPath, combined);

	// Compare to existing markdown if present.
	const existingPath = join(destDir, filenameMd);
	let existing = null;
	if (existsSync(existingPath)) existing = readFileSync(existingPath, 'utf-8');

	const stats = {
		slug: meta.slug,
		generatedAt: new Date().toISOString(),
		pageCount: pageFiles.length,
		newChars: combined.length,
		oldChars: existing ? existing.length : null,
		ratio: existing ? +(combined.length / existing.length).toFixed(3) : null,
		pagesWithFootnotes,
		footnoteBodiesLifted,
		figuresInjected,
		residualArtifacts: {
			pictureMarkers: (combined.match(/==>\s*picture/g) ?? []).length,
			pseudoTablePipes: (combined.match(/\|\|\|/g) ?? []).length,
			starFootnotes: (combined.match(/\.\*[°¹²³⁴⁵⁶⁷⁸⁹]/g) ?? []).length,
			brackedFragments: (combined.match(/\]\[/g) ?? []).length
		},
		destPath: destPath.replace(ROOT + '/', '')
	};
	writeFileSync(join(slugDir, 'reconcile.json'), JSON.stringify(stats, null, 2));
	return stats;
}

// --- Main ------------------------------------------------------------------

const args = parseStageArgs(process.argv.slice(2));
const allMeta = loadAllMetadata();
const targets = selectTargets(args, allMeta);

console.log(pad('pages', 6) + pad('newCh', 8) + pad('oldCh', 8) + pad('ratio', 7) + pad('fnLift', 7) + pad('artif', 6) + 'slug');
console.log('-'.repeat(110));
for (const meta of targets) {
	try {
		const s = reconcileOne(meta);
		const totalArtifacts = Object.values(s.residualArtifacts).reduce((a, b) => a + b, 0);
		console.log(
			pad(s.pageCount, 6) +
				pad(s.newChars, 8) +
				pad(s.oldChars ?? '-', 8) +
				pad(s.ratio ?? '-', 7) +
				pad(s.footnoteBodiesLifted, 7) +
				pad(totalArtifacts, 6) +
				meta.slug
		);
	} catch (err) {
		console.log(pad('ERR', 6) + ' '.repeat(36) + meta.slug + '  — ' + err.message);
	}
}
