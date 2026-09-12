// Lab decks, loaded and filtered on the server.
//
// This module is server-only on purpose. Decks marked `draft: true` are
// unpublished work; if the deck data were imported by a component, every
// draft slide would ship inside the client bundle where anyone could read
// it. Routes load what they need through +page.server.ts instead, so an
// unpublished deck never leaves the server.

import { dev } from '$app/environment';
import { parseLab, type Lab } from '$lib/data/lab-decks/parse';

const files = import.meta.glob('$lib/data/lab-decks/lab-*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export const allLabs: Lab[] = Object.entries(files)
	.map(([path, src]) => parseLab(src, path.replace(/^.*\//, '')))
	.sort((a, b) => a.number - b.number);

/**
 * Drafts are visible while developing (so a deck can be written and
 * rehearsed) and to instructors once deployed. Everyone else is told the
 * deck does not exist.
 */
export function isLabVisible(
	lab: Pick<Lab, 'draft'>,
	viewer: { dev: boolean; isInstructor: boolean }
): boolean {
	if (!lab.draft) return true;
	return viewer.dev || viewer.isInstructor;
}

export function visibleLabs(isInstructor: boolean): Lab[] {
	return allLabs.filter((l) => isLabVisible(l, { dev, isInstructor }));
}

export function getVisibleLab(number: number, isInstructor: boolean): Lab | undefined {
	const lab = allLabs.find((l) => l.number === number);
	if (!lab) return undefined;
	return isLabVisible(lab, { dev, isInstructor }) ? lab : undefined;
}
