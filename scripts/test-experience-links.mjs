import test from 'node:test';
import assert from 'node:assert/strict';
import {
	experienceContext,
	courseExperienceHref,
	nekhenExperienceHref
} from '../src/lib/experience-links.ts';

const room = 'next-word-92d24382-6b1d-46b4-9c9d-c141367e0b1f';

test('slide → Nekhen → experiment → slides preserves the room and slide', () => {
	const context = experienceContext(new URL(`http://127.0.0.1:5180/lab/1?s=17&classroom=${room}`));
	const nekhen = new URL(nekhenExperienceHref(context));
	assert.equal(nekhen.origin, 'http://127.0.0.1:3010');
	assert.equal(nekhen.pathname, `/board/${room}`);
	const returned = { ...experienceContext(nekhen), room };
	const demo = new URL(courseExperienceHref('/sampling#monte-carlo', returned));
	assert.equal(demo.hash, '#monte-carlo');
	assert.equal(demo.searchParams.get('slide'), '17');
	const slide = new URL(courseExperienceHref('/lab/1', experienceContext(demo)));
	assert.equal(slide.searchParams.get('s'), '17');
	assert.equal(slide.searchParams.get('classroom'), room);
});

test('published links cannot inherit localhost or arbitrary course destinations', () => {
	for (const course of [
		'javascript:alert(1)',
		'https://example.com',
		'http://127.0.0.1:5180',
		'https://atek639.calarts.app.evil.example'
	]) {
		const context = experienceContext(
			new URL(
				`https://nekhen.toolofna.ai/board/next-word?course=${encodeURIComponent(course)}&slide=-4&classroom=../../elsewhere`
			)
		);
		assert.equal(context.course, 'https://atek639.calarts.app');
		assert.equal(context.room, 'next-word');
		assert.equal(context.slide, 1);
		assert.equal(new URL(nekhenExperienceHref(context)).origin, 'https://nekhen.toolofna.ai');
	}
});

test('the current slide overrides remembered state; remembered room survives simple back links', () => {
	const saved = { room, slide: 7, course: 'http://localhost:5180' };
	const context = experienceContext(new URL('http://localhost:5180/lab/1?s=8'), saved, 19);
	assert.equal(context.slide, 19);
	assert.equal(context.room, room);
	assert.equal(new URL(nekhenExperienceHref(context)).hostname, 'localhost');
});
