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

// Load people alias index if it's been built. Aliases are inserted into the
// reading markdown as inline links so students can tap a name and land on
// /people/<slug>. First mention per reading is bolded for scannability;
// later mentions are plain links.
let aliasMap = null;
let aliasPattern = null;
try {
	const aliasPath = join(root, 'static', 'people-aliases.json');
	if (existsSync(aliasPath)) {
		const parsed = JSON.parse(readFileSync(aliasPath, 'utf-8'));
		aliasMap = parsed.aliases ?? {};
		const aliases = Object.keys(aliasMap)
			.filter((a) => a.length >= 4)
			.sort((a, b) => b.length - a.length); // longest-first so "Niels Bohr" beats "Bohr"
		if (aliases.length) {
			const escaped = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
			aliasPattern = new RegExp(`(?<![A-Za-zÀ-ÿ])(${escaped.join('|')})(?![A-Za-zÀ-ÿ])`, 'g');
		}
	}
} catch (err) {
	console.warn('Could not load people-aliases.json:', err.message);
}

// Walk the markdown and inject inline person links. Skip anything inside
// existing markdown links, image refs, code spans, or the figure/caption
// blockquotes — auto-linking inside those would corrupt the structure.
function injectPersonLinks(md, slug) {
	if (!aliasPattern || !aliasMap) return md;
	const seen = new Set();
	const lines = md.split('\n');
	const out = [];
	let inFence = false;
	for (const line of lines) {
		if (line.trim().startsWith('```')) {
			inFence = !inFence;
			out.push(line);
			continue;
		}
		if (inFence) {
			out.push(line);
			continue;
		}
		// Skip image syntax + figure caption/figure-text blockquote lines.
		if (line.startsWith('![') || line.startsWith('> **Caption:') || line.startsWith('> **Figure text:')) {
			out.push(line);
			continue;
		}
		// Walk the line piece by piece, leaving existing [link](...) and
		// `code` segments alone.
		out.push(rewriteLine(line, seen));
	}
	return out.join('\n');
}

function rewriteLine(line, seen) {
	// Tokenize: find existing markdown links and code spans; everything else is rewriteable text.
	const segments = [];
	const tokenRe = /(\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
	let lastIdx = 0;
	let m;
	while ((m = tokenRe.exec(line)) !== null) {
		if (m.index > lastIdx) segments.push({ kind: 'text', value: line.slice(lastIdx, m.index) });
		segments.push({ kind: 'opaque', value: m[0] });
		lastIdx = tokenRe.lastIndex;
	}
	if (lastIdx < line.length) segments.push({ kind: 'text', value: line.slice(lastIdx) });

	for (const s of segments) {
		if (s.kind !== 'text') continue;
		s.value = s.value.replace(aliasPattern, (alias) => {
			const personSlug = aliasMap[alias];
			if (!personSlug) return alias;
			const key = personSlug;
			const isFirst = !seen.has(key);
			seen.add(key);
			const link = `[${alias}](/people/${personSlug})`;
			return isFirst ? `**${link}**` : link;
		});
	}
	return segments.map((s) => s.value).join('');
}

function ingest(file, parentDir) {
	if (!file.endsWith('.md')) return;
	if (file.endsWith('-old.md')) return;
	const slug = slugify(parentDir ? `${parentDir}/${file}` : file);
	if (seen.has(slug)) return;
	seen.add(slug);
	const fullPath = parentDir ? join(mdRoot, parentDir, file) : join(mdRoot, file);
	const raw = readFileSync(fullPath, 'utf-8');
	const linked = injectPersonLinks(raw, slug);
	writeFileSync(join(outDir, `${slug}.md`), linked);
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
