import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import { weeks, introductoryReadings, type Reading } from '$lib/data/syllabus';
import { getReadingContent } from '$lib/data/readings';
import { slugify } from '$lib/utils/slug';
import type { PageServerLoad, EntryGenerator } from './$types';

interface ReadingMeta {
	reading: Reading;
	weekNumber?: number;
	weekTitle?: string;
	isAdditional: boolean;
	isIntroductory: boolean;
}

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

const metaMap = buildMetaMap();

export const entries: EntryGenerator = () => {
	return Array.from(metaMap.keys())
		.filter((slug) => getReadingContent(slug) !== undefined)
		.map((slug) => ({ slug }));
};

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
	const meta = metaMap.get(params.slug);
	const raw = getReadingContent(params.slug);

	if (!meta || !raw) {
		error(404, 'Reading not found');
	}

	const content = await marked(raw);

	return {
		content,
		slug: params.slug,
		title: meta.reading.title,
		author: meta.reading.author,
		pdf: meta.reading.pdf,
		weekNumber: meta.weekNumber,
		weekTitle: meta.weekTitle,
		isAdditional: meta.isAdditional,
		isIntroductory: meta.isIntroductory
	};
};
