// Build-time step: copies each markdown/<file>.md into
// static/reading-content/<slug>.md so SvelteKit ships them as static assets
// (served by Cloudflare's [assets] binding, NOT inlined into the Worker
// bundle). The reader page fetches the one it needs via event.fetch.
//
// Why not inline: a single bundled object literal of all 72 readings was
// ~5.4 MB of JS that V8 had to parse on every Worker cold start. Per-slug
// static files are served from CDN and never enter the Worker isolate.
//
// Why not /readings/: src/routes/readings/+page.svelte owns that prefix,
// so the SvelteKit router intercepts /readings/<anything> before the
// static-asset fallback runs. /reading-content/ has no route conflict.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

function slugify(filename) {
	return filename
		.replace(/\.(pdf|md)$/i, '')
		.replace(/^additional_reading_primary_documents\//, '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const root = process.cwd();
const mdRoot = join(root, 'markdown');
const outDir = join(root, 'static', 'reading-content');

if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

let count = 0;
const seen = new Set();
const fallbackMeta = {}; // slug -> { author, title } parsed from filename

// Markdown filenames mostly follow "Author, Title.md" or "Author - Title.md".
// This isn't perfect for every case (some have nested commas, dashes in titles)
// but it's much better than showing "Unknown" for readings that aren't in
// syllabus.ts.
function parseAuthorTitle(filename) {
	const stem = filename.replace(/\.md$/, '');
	let m = stem.match(/^([^,]+?),\s*(.+)$/);
	if (m) return { author: m[1].trim(), title: m[2].trim() };
	m = stem.match(/^([^-]+?)\s+-\s+(.+)$/);
	if (m) return { author: m[1].trim(), title: m[2].trim() };
	return { author: '', title: stem };
}

function ingest(file, parentDir) {
	if (!file.endsWith('.md')) return;
	if (file.endsWith('-old.md')) return;
	const slug = slugify(parentDir ? `${parentDir}/${file}` : file);
	if (seen.has(slug)) return; // .md and additional/.md collide
	seen.add(slug);
	const fullPath = parentDir ? join(mdRoot, parentDir, file) : join(mdRoot, file);
	const content = readFileSync(fullPath, 'utf-8');
	writeFileSync(join(outDir, `${slug}.md`), content);
	fallbackMeta[slug] = parseAuthorTitle(file);
	count++;
}

for (const file of readdirSync(mdRoot)) {
	ingest(file, null);
}

const additionalDir = join(mdRoot, 'additional_reading_primary_documents');
if (existsSync(additionalDir)) {
	for (const file of readdirSync(additionalDir)) {
		ingest(file, 'additional_reading_primary_documents');
	}
}

// Fallback metadata for readings that exist in the corpus but aren't
// referenced in syllabus.ts. Loaded by /search to render real names instead
// of "Unknown".
writeFileSync(
	join(root, 'static', 'readings-fallback.json'),
	JSON.stringify(fallbackMeta, null, 0)
);
console.log(`Generated ${count} reading entries → static/reading-content/ + readings-fallback.json`);
