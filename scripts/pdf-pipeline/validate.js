#!/usr/bin/env node
// Stage 6 of the PDF pipeline. See scripts/PDF_PIPELINE.md.
//
// Reads the *shipped* markdown (markdown/<filename>.md — the artifact the
// reader actually renders, not the .md.new staging file) plus the per-page VLM
// output under work/<slug>/vlm/, and reports defects a human should look at
// before the corpus is considered done. Nothing here calls the network and
// nothing here rewrites markdown: this is a report, not a gate, so it always
// exits 0.
//
// Checks:
//   1. Orphaned footnote markers — inline `[^N]` with no `[^N]:` definition.
//      Inline markers are counted on non-definition lines only, because a
//      definition line ("[^12]: Ibid., 42.") also contains the bracket
//      pattern and would otherwise self-satisfy.
//   2. Unused footnote definitions — `[^N]:` with no inline marker.
//   3. Extraction-failure placeholders — `<!-- page N: extraction failed …`
//      comments left behind by fallback.js (Gemini RECITATION blocks).
//   4. Unresolved figure markers — `**[Figure: …]**`, i.e. a figure the VLM
//      saw but reconcile.js could not bind to an extracted image URL.
//   5. Resolved figure count — `![…](http…)` image refs (informational).
//   6. Char-ratio regression — read from work/<slug>/reconcile.json, flagged
//      below 0.85. NOTE: reconcile.js compares its output against the file it
//      is about to replace, so once a .md.new has been promoted over the
//      original by hand a re-run compares the output against itself and the
//      ratio pins to exactly 1. We surface the STORED value and mark it
//      `stale` at 1 rather than recomputing — recomputing would just launder
//      the same self-comparison into a fresh-looking number.
//   7. Short/blank pages — work/<slug>/vlm/page_NNNN.md under 200 chars that
//      is not the `<!-- blank page -->` sentinel.
//   8. Residual legacy artifacts — `==> picture`, `|||` pseudo-table runs,
//      `*°` star footnotes, `][` bracket fragments (same four counters
//      reconcile.js records, re-measured against the shipped file).
//
// A reading "needs attention" if it has any orphaned marker, any unused
// definition, any extraction placeholder, any residual artifact, a non-stale
// ratio regression, or more than SHORT_PAGE_LIMIT short pages (one or two
// short pages is normal — title pages, part dividers, plate pages).
//
// Outputs:
//   work/<slug>/report.json      per-reading detail incl. samples
//   work/validation-summary.json corpus roll-up
//
// Usage:
//   node scripts/pdf-pipeline/validate.js <slug>
//   node scripts/pdf-pipeline/validate.js --all
//   node scripts/pdf-pipeline/validate.js --class=notes-heavy

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { ROOT, WORK_DIR, loadAllMetadata, parseStageArgs, selectTargets, pad } from './lib/work.js';
import { slugify } from './lib/slug.js';

const MARKDOWN_DIR = join(ROOT, 'markdown');
const ADDITIONAL_SUBDIR = 'additional_reading_primary_documents';

const RATIO_FLOOR = 0.85; // spec says flag a >15% char drop
const SHORT_PAGE_CHARS = 200;
const SHORT_PAGE_LIMIT = 2; // more than this many short pages → attention
const SAMPLES = 6; // how many examples to keep in report.json

// --- Locating the shipped markdown -----------------------------------------

// Built lazily: slug → absolute path, for every markdown/*.md and
// markdown/additional_reading_primary_documents/*.md. The direct
// filename-derived path is tried first; this index is the fallback for
// readings whose PDF filename and markdown filename drifted apart.
let markdownIndex = null;

function buildMarkdownIndex() {
	const index = new Map();
	const add = (file, subdir) => {
		if (!file.endsWith('.md')) return;
		if (file.endsWith('-old.md')) return; // generate-readings.js skips these too
		const slug = slugify(subdir ? `${subdir}/${file}` : file);
		if (!index.has(slug)) index.set(slug, subdir ? join(MARKDOWN_DIR, subdir, file) : join(MARKDOWN_DIR, file));
	};
	if (existsSync(MARKDOWN_DIR)) {
		for (const file of readdirSync(MARKDOWN_DIR)) {
			const full = join(MARKDOWN_DIR, file);
			if (statSync(full).isDirectory()) continue;
			add(file, null);
		}
		const additional = join(MARKDOWN_DIR, ADDITIONAL_SUBDIR);
		if (existsSync(additional)) {
			for (const file of readdirSync(additional)) add(file, ADDITIONAL_SUBDIR);
		}
	}
	return index;
}

function resolveMarkdownPath(meta) {
	const filenameMd = meta.filename.replace(/\.pdf$/i, '.md');
	const subdir = meta.subdir ?? '';
	const direct = subdir ? join(MARKDOWN_DIR, subdir, filenameMd) : join(MARKDOWN_DIR, filenameMd);
	if (existsSync(direct)) return direct;
	if (!markdownIndex) markdownIndex = buildMarkdownIndex();
	return markdownIndex.get(meta.slug) ?? null;
}

// --- Individual checks ------------------------------------------------------

// 1 + 2. Footnote wiring. Definition lines are excluded from the inline scan
// (markdown allows up to 3 spaces of leading indent on a block start).
const DEF_LINE = /^ {0,3}\[\^([^\]\s]+)\]:/;
const INLINE_MARKER = /\[\^([^\]\s]+)\]/g;

function checkFootnotes(md) {
	const definitions = new Map(); // marker → count
	const inline = new Map(); // marker → count
	const inlineOrder = [];
	for (const line of md.split('\n')) {
		const def = line.match(DEF_LINE);
		if (def) {
			definitions.set(def[1], (definitions.get(def[1]) ?? 0) + 1);
			continue;
		}
		for (const m of line.matchAll(INLINE_MARKER)) {
			if (!inline.has(m[1])) inlineOrder.push(m[1]);
			inline.set(m[1], (inline.get(m[1]) ?? 0) + 1);
		}
	}
	const orphanIds = inlineOrder.filter((id) => !definitions.has(id));
	const orphanOccurrences = orphanIds.reduce((n, id) => n + inline.get(id), 0);
	const unusedIds = [...definitions.keys()].filter((id) => !inline.has(id));
	return {
		inlineMarkers: [...inline.values()].reduce((a, b) => a + b, 0),
		definitions: definitions.size,
		orphaned: {
			occurrences: orphanOccurrences,
			distinct: orphanIds.length,
			samples: orphanIds.slice(0, SAMPLES).map((id) => `[^${id}]`)
		},
		unusedDefinitions: {
			count: unusedIds.length,
			samples: unusedIds.slice(0, SAMPLES).map((id) => `[^${id}]:`)
		}
	};
}

// 3. Placeholders written by fallback.js when the VLM refused a page.
function checkExtractionFailures(md) {
	const pages = [];
	for (const m of md.matchAll(/<!--\s*page (\d+): extraction failed/g)) pages.push(Number(m[1]));
	pages.sort((a, b) => a - b);
	return { count: pages.length, pages };
}

// 4 + 5. Figures. `**[Figure: …]**` is reconcile.js's fallback when no image
// was extracted for the page; `![…](http…)` is a figure that made it to R2.
function checkFigures(md) {
	const unresolvedCount = (md.match(/\*\*\[Figure:/g) ?? []).length;
	const samples = [];
	for (const m of md.matchAll(/\*\*\[Figure:\s*(.*?)\]\*\*/g)) {
		if (samples.length >= SAMPLES) break;
		samples.push(m[1].slice(0, 60));
	}
	// Alt text sometimes contains its own brackets (`… LAION [78] database`),
	// so the alt segment is matched lazily rather than as [^\]]*.
	const resolved = (md.match(/!\[.*?\]\(https?:\/\//g) ?? []).length;
	return { unresolved: unresolvedCount, unresolvedSamples: samples, resolved };
}

// 6. Stored char ratio from Stage 5. Never recomputed here — see header.
function readCharRatio(slugDir) {
	const path = join(slugDir, 'reconcile.json');
	if (!existsSync(path)) return { present: false, newChars: null, oldChars: null, ratio: null, stale: false, regression: false };
	let stats;
	try {
		stats = JSON.parse(readFileSync(path, 'utf-8'));
	} catch (err) {
		return { present: false, error: err.message, newChars: null, oldChars: null, ratio: null, stale: false, regression: false };
	}
	const ratio = stats.ratio ?? null;
	const stale = ratio === 1; // .md.new was promoted by hand; comparison is self-vs-self
	return {
		present: true,
		newChars: stats.newChars ?? null,
		oldChars: stats.oldChars ?? null,
		ratio,
		stale,
		regression: ratio !== null && !stale && ratio < RATIO_FLOOR,
		note: stale ? 'ratio===1: reconcile compared output against itself (promoted .md.new) — uninformative' : undefined
	};
}

// 7. Pages where Stage 4 returned almost nothing.
const BLANK_SENTINEL = /^<!--\s*blank page\s*-->$/i;

function checkShortPages(slugDir) {
	const vlmDir = join(slugDir, 'vlm');
	if (!existsSync(vlmDir)) return { checked: 0, blank: 0, count: 0, placeholders: 0, pages: [] };
	const files = readdirSync(vlmDir).filter((f) => /^page_\d{4}\.md$/.test(f)).sort();
	const pages = [];
	let blank = 0;
	let placeholders = 0;
	for (const file of files) {
		const text = readFileSync(join(vlmDir, file), 'utf-8').trim();
		if (BLANK_SENTINEL.test(text)) { blank++; continue; }
		if (text.length >= SHORT_PAGE_CHARS) continue;
		const page = Number(file.match(/^page_(\d{4})\.md$/)[1]);
		const placeholder = /extraction failed/.test(text);
		if (placeholder) placeholders++;
		pages.push({ page, chars: text.length, placeholder });
	}
	return { checked: files.length, blank, count: pages.length, placeholders, pages: pages.slice(0, 40) };
}

// 8. Legacy single-pass artifacts. Same counters reconcile.js stores, but
// measured against the shipped markdown rather than the staged output.
function checkResidualArtifacts(md) {
	return {
		pictureMarkers: (md.match(/==>\s*picture/g) ?? []).length,
		pseudoTablePipes: (md.match(/\|\|\|/g) ?? []).length,
		starFootnotes: (md.match(/\.\*[°¹²³⁴⁵⁶⁷⁸⁹]/g) ?? []).length,
		bracketFragments: (md.match(/\]\[/g) ?? []).length
	};
}

// --- Validate one slug ------------------------------------------------------

function validateOne(meta) {
	const slugDir = join(WORK_DIR, meta.slug);
	const mdPath = resolveMarkdownPath(meta);
	if (!mdPath) throw new Error(`No markdown/ file resolves to slug (looked for ${meta.filename.replace(/\.pdf$/i, '.md')}).`);
	const md = readFileSync(mdPath, 'utf-8');

	const footnotes = checkFootnotes(md);
	const extraction = checkExtractionFailures(md);
	const figures = checkFigures(md);
	const charRatio = readCharRatio(slugDir);
	const shortPages = checkShortPages(slugDir);
	const residualArtifacts = checkResidualArtifacts(md);
	const residualTotal = Object.values(residualArtifacts).reduce((a, b) => a + b, 0);

	const issues = [];
	if (footnotes.orphaned.occurrences) {
		issues.push(`${footnotes.orphaned.occurrences} orphaned footnote markers (${footnotes.orphaned.distinct} distinct): ${footnotes.orphaned.samples.join(' ')}`);
	}
	if (footnotes.unusedDefinitions.count) issues.push(`${footnotes.unusedDefinitions.count} unused footnote definitions`);
	if (extraction.count) issues.push(`${extraction.count} extraction-failure placeholders (pages ${extraction.pages.join(', ')})`);
	if (figures.unresolved) issues.push(`${figures.unresolved} unresolved figure markers`);
	if (residualTotal) issues.push(`${residualTotal} residual legacy artifacts ${JSON.stringify(residualArtifacts)}`);
	if (charRatio.regression) issues.push(`char ratio ${charRatio.ratio} < ${RATIO_FLOOR}`);
	if (charRatio.stale) issues.push('char ratio is stale (===1, self-comparison)');
	if (shortPages.count > SHORT_PAGE_LIMIT) issues.push(`${shortPages.count} VLM pages under ${SHORT_PAGE_CHARS} chars`);

	const needsAttention =
		footnotes.orphaned.occurrences > 0 ||
		footnotes.unusedDefinitions.count > 0 ||
		extraction.count > 0 ||
		residualTotal > 0 ||
		charRatio.regression ||
		shortPages.count > SHORT_PAGE_LIMIT;

	// Severity is only used to sort the table worst-first. Weights are ranked
	// by how visible the defect is to a reader: a page that failed to extract
	// is a hole in the text; an unresolved figure is a missing picture.
	const severity =
		extraction.count * 10 +
		footnotes.orphaned.occurrences * 3 +
		footnotes.unusedDefinitions.count * 2 +
		residualTotal * 2 +
		shortPages.count * 2 +
		figures.unresolved * 1 +
		(charRatio.regression ? 50 : 0);

	const report = {
		slug: meta.slug,
		generatedAt: new Date().toISOString(),
		classification: meta.classification ?? null,
		markdownPath: mdPath.replace(ROOT + '/', ''),
		chars: md.length,
		footnotes,
		extractionFailures: extraction,
		figures,
		charRatio,
		shortPages,
		residualArtifacts,
		residualArtifactTotal: residualTotal,
		severity,
		needsAttention,
		issues
	};
	if (existsSync(slugDir)) writeFileSync(join(slugDir, 'report.json'), JSON.stringify(report, null, 2));
	return report;
}

// --- Main -------------------------------------------------------------------

const args = parseStageArgs(process.argv.slice(2));
const allMeta = loadAllMetadata();
const targets = selectTargets(args, allMeta);

const reports = [];
const errors = [];
for (const meta of targets) {
	try {
		reports.push(validateOne(meta));
	} catch (err) {
		errors.push({ slug: meta.slug, error: err.message });
	}
}

reports.sort((a, b) => b.severity - a.severity || a.slug.localeCompare(b.slug));

const header =
	pad('sev', 6) +
	pad('orph', 6) +
	pad('unus', 6) +
	pad('xfail', 6) +
	pad('figX', 6) +
	pad('img', 5) +
	pad('short', 6) +
	pad('artif', 6) +
	pad('ratio', 8) +
	'slug';
console.log(header);
console.log('-'.repeat(125));

const totals = { severity: 0, orphaned: 0, orphanDistinct: 0, unused: 0, extraction: 0, unresolved: 0, resolved: 0, short: 0, artifacts: 0 };
const docsWith = { orphaned: 0, unused: 0, extraction: 0, unresolved: 0, resolved: 0, short: 0, artifacts: 0, staleRatio: 0, regression: 0 };

for (const r of reports) {
	totals.severity += r.severity;
	totals.orphaned += r.footnotes.orphaned.occurrences;
	totals.orphanDistinct += r.footnotes.orphaned.distinct;
	totals.unused += r.footnotes.unusedDefinitions.count;
	totals.extraction += r.extractionFailures.count;
	totals.unresolved += r.figures.unresolved;
	totals.resolved += r.figures.resolved;
	totals.short += r.shortPages.count;
	totals.artifacts += r.residualArtifactTotal;
	if (r.footnotes.orphaned.occurrences) docsWith.orphaned++;
	if (r.footnotes.unusedDefinitions.count) docsWith.unused++;
	if (r.extractionFailures.count) docsWith.extraction++;
	if (r.figures.unresolved) docsWith.unresolved++;
	if (r.figures.resolved) docsWith.resolved++;
	if (r.shortPages.count) docsWith.short++;
	if (r.residualArtifactTotal) docsWith.artifacts++;
	if (r.charRatio.stale) docsWith.staleRatio++;
	if (r.charRatio.regression) docsWith.regression++;

	const ratioCell = r.charRatio.ratio === null ? '-' : r.charRatio.stale ? '1 stale' : String(r.charRatio.ratio) + (r.charRatio.regression ? '!' : '');
	console.log(
		pad(r.severity, 6) +
			pad(r.footnotes.orphaned.occurrences || '', 6) +
			pad(r.footnotes.unusedDefinitions.count || '', 6) +
			pad(r.extractionFailures.count || '', 6) +
			pad(r.figures.unresolved || '', 6) +
			pad(r.figures.resolved || '', 5) +
			pad(r.shortPages.count || '', 6) +
			pad(r.residualArtifactTotal || '', 6) +
			pad(ratioCell, 8) +
			r.slug
	);
}
for (const e of errors) console.log(pad('ERR', 6) + ' '.repeat(43) + e.slug + '  — ' + e.error);

console.log('-'.repeat(125));
console.log(
	pad('TOTAL', 6) +
		pad(totals.orphaned, 6) +
		pad(totals.unused, 6) +
		pad(totals.extraction, 6) +
		pad(totals.unresolved, 6) +
		pad(totals.resolved, 5) +
		pad(totals.short, 6) +
		pad(totals.artifacts, 6) +
		pad('', 8) +
		`${reports.length} readings` +
		(errors.length ? `, ${errors.length} unreadable` : '')
);
console.log(
	`  orphaned markers in ${docsWith.orphaned} docs (${totals.orphanDistinct} distinct ids) · ` +
		`unused defs in ${docsWith.unused} · extraction failures in ${docsWith.extraction} · ` +
		`unresolved figures in ${docsWith.unresolved} · resolved images in ${docsWith.resolved} · ` +
		`short pages in ${docsWith.short} · artifacts in ${docsWith.artifacts}`
);
console.log(`  char ratio: ${docsWith.regression} below ${RATIO_FLOOR}, ${docsWith.staleRatio} stale (===1, self-comparison — not a real measurement)`);

const needing = reports.filter((r) => r.needsAttention);
const summary = {
	generatedAt: new Date().toISOString(),
	ratioFloor: RATIO_FLOOR,
	shortPageChars: SHORT_PAGE_CHARS,
	count: reports.length,
	needsAttention: needing.length,
	totals,
	docsWith,
	errors,
	readings: reports.map((r) => ({
		slug: r.slug,
		severity: r.severity,
		needsAttention: r.needsAttention,
		chars: r.chars,
		orphanedFootnotes: r.footnotes.orphaned.occurrences,
		orphanedFootnotesDistinct: r.footnotes.orphaned.distinct,
		unusedFootnoteDefs: r.footnotes.unusedDefinitions.count,
		extractionFailures: r.extractionFailures.count,
		unresolvedFigures: r.figures.unresolved,
		resolvedFigures: r.figures.resolved,
		shortPages: r.shortPages.count,
		residualArtifacts: r.residualArtifactTotal,
		ratio: r.charRatio.ratio,
		ratioStale: r.charRatio.stale,
		issues: r.issues
	}))
};
// Only a full run owns the corpus-wide summary — a single-slug or --class run
// would otherwise clobber it with a partial picture.
if (args.all) writeFileSync(join(WORK_DIR, 'validation-summary.json'), JSON.stringify(summary, null, 2));

console.log('');
console.log(`${needing.length} readings need attention (of ${reports.length} validated).`);
console.log(
	args.all
		? `Wrote work/validation-summary.json and ${reports.length} per-reading report.json files.`
		: `Wrote ${reports.length} per-reading report.json files (pass --all to refresh work/validation-summary.json).`
);
