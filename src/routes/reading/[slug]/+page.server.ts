import { error } from '@sveltejs/kit';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { marked } from 'marked';
import { weeks, introductoryReadings, type Reading } from '$lib/data/syllabus';
import { slugify } from '$lib/utils/slug';
import type { PageServerLoad, EntryGenerator } from './$types';

interface ReadingMeta {
	reading: Reading;
	weekNumber?: number;
	weekTitle?: string;
	isAdditional: boolean;
	isIntroductory: boolean;
}

// Build metadata map from syllabus data (slug → metadata)
function buildMetaMap(): Map<string, ReadingMeta> {
	const map = new Map<string, ReadingMeta>();

	for (const reading of introductoryReadings) {
		map.set(slugify(reading.pdf), {
			reading,
			isAdditional: false,
			isIntroductory: true
		});
	}

	for (const week of weeks) {
		for (const reading of week.readings) {
			map.set(slugify(reading.pdf), {
				reading,
				weekNumber: week.number,
				weekTitle: week.title,
				isAdditional: false,
				isIntroductory: false
			});
		}
		for (const reading of week.additionalReadings) {
			map.set(slugify(reading.pdf), {
				reading,
				weekNumber: week.number,
				weekTitle: week.title,
				isAdditional: true,
				isIntroductory: false
			});
		}
	}

	return map;
}

// Scan markdown directories and build slug → filepath map
function buildFileMap(): Map<string, string> {
	const map = new Map<string, string>();
	const mdRoot = join(process.cwd(), 'markdown');

	for (const file of readdirSync(mdRoot)) {
		if (file.endsWith('.md')) {
			const slug = slugify(file);
			map.set(slug, join(mdRoot, file));
		}
	}

	const additionalDir = join(mdRoot, 'additional_reading_primary_documents');
	for (const file of readdirSync(additionalDir)) {
		if (file.endsWith('.md')) {
			const slug = slugify(file);
			map.set(slug, join(additionalDir, file));
		}
	}

	return map;
}

const metaMap = buildMetaMap();
const fileMap = buildFileMap();

export const entries: EntryGenerator = () => {
	// Only generate pages for readings that have both metadata and a file
	const slugs = new Set([...metaMap.keys()].filter((s) => fileMap.has(s)));
	return Array.from(slugs).map((slug) => ({ slug }));
};

export const load: PageServerLoad = async ({ params }) => {
	const meta = metaMap.get(params.slug);
	const filePath = fileMap.get(params.slug);

	if (!meta || !filePath) {
		error(404, 'Reading not found');
	}

	let content: string;
	try {
		const raw = readFileSync(filePath, 'utf-8');
		content = await marked(raw);
	} catch {
		error(404, 'Reading content not found');
	}

	return {
		content,
		title: meta.reading.title,
		author: meta.reading.author,
		pdf: meta.reading.pdf,
		weekNumber: meta.weekNumber,
		weekTitle: meta.weekTitle,
		isAdditional: meta.isAdditional,
		isIntroductory: meta.isIntroductory
	};
};
