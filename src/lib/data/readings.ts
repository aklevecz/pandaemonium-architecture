import readings from './reading-content';

export function getReadingContent(slug: string): string | undefined {
	return readings[slug];
}
