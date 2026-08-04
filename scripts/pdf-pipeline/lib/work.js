// Shared helpers used by every stage. Keeps each stage script focused on the
// thing it actually does (render, vlm, reconcile, ...).

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { slugify } from './slug.js';

export const ROOT = process.cwd();
export const WORK_DIR = join(ROOT, 'work');
export const PDFS_DIR = join(ROOT, 'PDFs');

// Every PDF under PDFs/, as a path RELATIVE to PDFs/ — so the additional
// readings come back as "additional_reading_primary_documents/Foo.pdf".
// The relative path is what slugify() expects (it strips that subdir prefix);
// a flat readdirSync of PDFs/ misses the whole subdir.
export function listPdfsRelative(dir = PDFS_DIR, prefix = '') {
	if (!existsSync(dir)) return [];
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) out.push(...listPdfsRelative(join(dir, entry.name), rel));
		else if (/\.pdf$/i.test(entry.name)) out.push(rel);
	}
	return out;
}

// Absolute path to the source PDF whose slugified name is `slug`, or null.
// Searches PDFs/ recursively so additional readings resolve too.
export function findPdfForSlug(slug) {
	const rel = listPdfsRelative().find((f) => slugify(f) === slug);
	return rel ? join(PDFS_DIR, rel) : null;
}

// Walk work/ and return every PDF's metadata.json. Skips dirs that haven't
// been triaged yet (no metadata).
export function loadAllMetadata() {
	if (!existsSync(WORK_DIR)) {
		console.error('No work/ dir — run `node scripts/pdf-pipeline/triage.js` first.');
		process.exit(1);
	}
	const out = [];
	for (const slug of readdirSync(WORK_DIR)) {
		const metaPath = join(WORK_DIR, slug, 'metadata.json');
		if (!existsSync(metaPath)) continue;
		try {
			out.push(JSON.parse(readFileSync(metaPath, 'utf-8')));
		} catch (err) {
			console.error(`[skip] ${slug}: bad metadata.json (${err.message})`);
		}
	}
	return out;
}

// Parse the common arg shape: <slug> | --all | --class=<name> [--force]
// Stages can pass `extras: { '--pages=': v => ... }` to handle additional flags.
export function parseStageArgs(argv, extras = {}) {
	const args = { force: false, all: false, class: null, slug: null };
	for (const a of argv) {
		if (a === '--force') args.force = true;
		else if (a === '--all') args.all = true;
		else if (a.startsWith('--class=')) args.class = a.slice('--class='.length);
		else {
			let handled = false;
			for (const [prefix, fn] of Object.entries(extras)) {
				if (a.startsWith(prefix)) { fn(args, a.slice(prefix.length)); handled = true; break; }
			}
			if (handled) continue;
			if (!args.slug && !a.startsWith('--')) args.slug = a;
			else { console.error(`Unexpected arg: ${a}`); process.exit(2); }
		}
	}
	return args;
}

// Resolve the targets from parsed args. Slug arg can be an exact match or a
// unique prefix (so users don't have to type the full slug).
export function selectTargets(args, allMeta) {
	if (args.all) return allMeta;
	if (args.class) return allMeta.filter((m) => m.classification === args.class);
	if (args.slug) {
		const exact = allMeta.find((m) => m.slug === args.slug);
		if (exact) return [exact];
		const prefix = allMeta.filter((m) => m.slug.startsWith(args.slug));
		if (prefix.length === 1) return prefix;
		if (prefix.length === 0) {
			console.error(`No PDF matches "${args.slug}".`);
			process.exit(1);
		}
		console.error(`Slug "${args.slug}" is ambiguous:`);
		for (const m of prefix) console.error(`  ${m.slug}`);
		process.exit(1);
	}
	console.error('Pass <slug>, --all, or --class=<name>.');
	process.exit(2);
}

// Right-pad a string to width n. Used for the per-stage stdout summary tables.
export function pad(s, n) {
	s = String(s);
	return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

export function pad4(n) {
	return String(n).padStart(4, '0');
}

export function fmtBytes(n) {
	if (n > 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)}G`;
	if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(0)}M`;
	if (n > 1024) return `${(n / 1024).toFixed(0)}K`;
	return `${n}B`;
}
