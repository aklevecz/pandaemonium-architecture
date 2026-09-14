// Mirrored in Nekhen's src/lib/next-word/experience-links.ts: both apps build independently.
export const experiences = [
	{ label: 'Life', path: '/life' },
	{ label: 'Loops', path: '/loops' },
	{ label: 'Voices', path: '/voices' },
	{ label: 'Monty Hall', path: '/monty-hall' },
	{ label: 'Gaussian sampling', path: '/sampling#gaussian' },
	{ label: 'Probability as area', path: '/sampling#area' },
	{ label: 'Monte Carlo', path: '/sampling#monte-carlo' },
	{ label: 'Temperature', path: '/sampling#temperature' },
	{ label: 'Denoise', path: '/denoise' }
];

export interface ExperienceContext {
	course: string;
	room: string;
	slide: number;
}
export const experienceStorageKey = 'lab-01-experiences';
export const validRoom = (value: unknown): value is string =>
	typeof value === 'string' &&
	(value === 'next-word' ||
		/^next-word-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value));
const validSlide = (value: unknown) =>
	Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 1000;
const local = (url: URL) => url.hostname === 'localhost' || url.hostname === '127.0.0.1';

export function experienceContext(
	url: URL,
	saved?: Partial<ExperienceContext> | null,
	slide?: number
): ExperienceContext {
	const fallback = local(url)
		? `${url.protocol}//${url.hostname}:5180`
		: ['https://atek639.calarts.app', 'https://a211h.yaytso.art'].includes(url.origin)
			? url.origin
			: 'https://atek639.calarts.app';
	const requestedCourse = url.searchParams.get('course') ?? saved?.course;
	let course = fallback;
	try {
		const candidate = new URL(requestedCourse ?? fallback);
		if (
			['https://atek639.calarts.app', 'https://a211h.yaytso.art'].includes(candidate.origin) ||
			(local(url) &&
				local(candidate) &&
				candidate.protocol === 'http:' &&
				candidate.port === '5180')
		)
			course = candidate.origin;
	} catch {
		/* Invalid incoming links use the known course origin. */
	}
	const room = url.searchParams.get('classroom');
	const atSlide =
		slide ??
		(url.pathname === '/lab/1' ? url.searchParams.get('s') : url.searchParams.get('slide'));
	return {
		course,
		room: validRoom(room) ? room : validRoom(saved?.room) ? saved.room : 'next-word',
		slide: validSlide(atSlide)
			? Number(atSlide)
			: validSlide(saved?.slide)
				? Number(saved!.slide)
				: 1
	};
}

export function courseExperienceHref(path: string, context: ExperienceContext): string {
	const url = new URL(path, context.course);
	url.searchParams.set('classroom', context.room);
	if (url.pathname === '/lab/1') url.searchParams.set('s', String(context.slide));
	else {
		url.searchParams.set('lab', '1');
		url.searchParams.set('slide', String(context.slide));
	}
	return url.href;
}

export function nekhenExperienceHref(context: ExperienceContext): string {
	const course = new URL(context.course);
	const origin = local(course)
		? `${course.protocol}//${course.hostname}:3010`
		: 'https://nekhen.calarts.app';
	const url = new URL(`/board/${context.room}`, origin);
	url.searchParams.set('course', course.origin);
	url.searchParams.set('slide', String(context.slide));
	return url.href;
}
