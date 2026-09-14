import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
	gaussianDensity,
	gaussianCdf,
	intervalProbability,
	sampleGaussian,
	seededRandom,
	densityHistogram,
	temperatureSigma
} from '../src/lib/sampling.ts';
import { parseLab } from '../src/lib/data/lab-decks/parse.ts';

const close = (actual, expected, tolerance = 1e-7) =>
	assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('normal density has the correct peak, symmetry, and location/scale transform', () => {
	close(gaussianDensity(0), 1 / Math.sqrt(2 * Math.PI), 1e-14);
	close(gaussianDensity(-2), gaussianDensity(2), 1e-14);
	close(gaussianDensity(4, 2, 2), gaussianDensity(1) / 2, 1e-14);
	assert.equal(gaussianDensity(Infinity), 0);
	assert.ok(gaussianDensity(0, 0, 0.2) > 1); // Density is not probability.
});

test('the Gaussian density integrates to one', () => {
	const step = 16 / 20_000;
	let area = 0;
	for (let i = 0; i < 20_000; i++) area += gaussianDensity(-8 + (i + 0.5) * step) * step;
	close(area, 1, 1e-10);
});

test('interval areas match the 68–95–99.7 rule and a point has zero area', () => {
	close(intervalProbability(-1, 1), 0.682689492, 2e-7);
	close(intervalProbability(-2, 2), 0.954499736, 2e-7);
	close(intervalProbability(-3, 3), 0.997300204, 2e-7);
	assert.equal(intervalProbability(0, 0), 0);
	close(intervalProbability(1, 5, 3, 2), intervalProbability(-1, 1), 1e-14);
	assert.ok(intervalProbability(2, 2.5) < intervalProbability(0, 0.5));
	assert.equal(gaussianCdf(-Infinity), 0);
	assert.equal(gaussianCdf(Infinity), 1);
	assert.equal(gaussianCdf(0), 0.5);
});

test('invalid distributions, draws, and interval bounds are rejected', () => {
	for (const sigma of [0, -1, NaN, Infinity]) assert.throws(() => gaussianDensity(0, 0, sigma));
	assert.throws(() => gaussianDensity(NaN));
	assert.throws(() => intervalProbability(2, -1));
	for (const value of [-1, 1, Infinity, NaN]) assert.throws(() => sampleGaussian(() => value));
	assert.equal(
		sampleGaussian(() => 0),
		0
	);
});

test('seeded Gaussian sampling replays and has the specified empirical mean and variance', () => {
	const sequence = (seed, n, mean = 0, sigma = 1) => {
		const rng = seededRandom(seed);
		return Array.from({ length: n }, () => sampleGaussian(rng, mean, sigma));
	};
	assert.deepEqual(sequence(2026, 50), sequence(2026, 50));
	assert.notDeepEqual(sequence(2026, 50), sequence(2027, 50));
	const values = sequence(42, 100_000, 2, 3);
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
	close(mean, 2, 0.04);
	close(variance, 9, 0.12);
	assert.ok(values.some((x) => x < 0) && values.some((x) => x > 5));
});

test('histogram density accounts for bin width and retains out-of-window mass', () => {
	const hist = densityHistogram([-3, -1, -0.5, 0, 1, 2, 4], -2, 2, 4);
	assert.deepEqual(hist.counts, [0, 2, 1, 2]);
	assert.equal(hist.outside, 2);
	close(hist.density.reduce((a, b) => a + b, 0) * hist.width, 5 / 7, 1e-14);
	assert.deepEqual(densityHistogram([], -1, 1, 2).density, [0, 0]);
	assert.throws(() => densityHistogram([NaN], -1, 1));
});

test('temperature scales standard deviation by sqrt(T), so variance scales by T', () => {
	assert.equal(temperatureSigma(2, 0.25), 1);
	assert.equal(temperatureSigma(2, 1), 2);
	assert.equal(temperatureSigma(2, 4), 4);
	close(temperatureSigma(2, 3) ** 2, 12, 1e-14);
	for (const t of [0, -1, Infinity, NaN]) assert.throws(() => temperatureSigma(1, t));
	const base = sampleGaussian(seededRandom(2026));
	close(
		sampleGaussian(seededRandom(2026), 5, temperatureSigma(2, 3)),
		5 + base * 2 * Math.sqrt(3),
		1e-14
	);
});

test('Lab 01 parses and its sampling demo links point to existing experiments', async () => {
	const lab = parseLab(
		await readFile(new URL('../src/lib/data/lab-decks/lab-01.md', import.meta.url), 'utf8')
	);
	assert.equal(lab.draft, true);
	const hrefs = lab.slides.filter((s) => s.kind === 'demo').map((s) => s.href);
	const samplingPage = await readFile(new URL('../src/routes/sampling/+page.svelte', import.meta.url), 'utf8');
	const samplingLinks = hrefs.filter((href) => href.startsWith('/sampling#'));
	assert.ok(samplingLinks.length > 0);
	for (const href of samplingLinks)
		assert.ok(samplingPage.includes(`id="${href.split('#')[1]}"`), `${href} has a target section`);
	assert.ok(!hrefs.some((href) => /#(bag|streaks|sampler)$/.test(href)));
});
