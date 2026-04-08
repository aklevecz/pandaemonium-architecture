import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function slugify(filename) {
	return filename
		.replace(/\.(pdf|md)$/i, '')
		.replace(/^additional_reading_primary_documents\//, '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const mdRoot = join(process.cwd(), 'markdown');
const entries = {};

// Main readings
for (const file of readdirSync(mdRoot)) {
	if (file.endsWith('.md')) {
		const slug = slugify(file);
		const content = readFileSync(join(mdRoot, file), 'utf-8');
		entries[slug] = content;
	}
}

// Additional readings
const additionalDir = join(mdRoot, 'additional_reading_primary_documents');
for (const file of readdirSync(additionalDir)) {
	if (file.endsWith('.md')) {
		const slug = slugify(file);
		const content = readFileSync(join(additionalDir, file), 'utf-8');
		entries[slug] = content;
	}
}

const output = `// Auto-generated - do not edit
const readings: Record<string, string> = ${JSON.stringify(entries, null, 0)};
export default readings;
`;

writeFileSync(join(process.cwd(), 'src', 'lib', 'data', 'reading-content.ts'), output);
console.log(`Generated ${Object.keys(entries).length} reading entries`);
