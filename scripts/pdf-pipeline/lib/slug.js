// Mirrors src/lib/utils/slug.ts and scripts/generate-readings.js so work/<slug>/
// lines up with markdown/<slug>.md.
export function slugify(filename) {
	return filename
		.replace(/\.(pdf|md)$/i, '')
		.replace(/^additional_reading_primary_documents\//, '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
