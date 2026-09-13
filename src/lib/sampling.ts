/** Gaussian samplers and density calculations for the Lab 01 experiments. */
function validateNormal(mean: number, sigma: number) {
	if (!Number.isFinite(mean) || !Number.isFinite(sigma) || sigma <= 0) {
		throw new Error('Mean must be finite and standard deviation must be positive.');
	}
}

export function gaussianDensity(x: number, mean = 0, sigma = 1): number {
	validateNormal(mean, sigma);
	if (Number.isNaN(x)) throw new Error('x cannot be NaN.');
	const z = (x - mean) / sigma;
	return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Box–Muller; use 1-u to keep the logarithm away from zero. */
export function sampleGaussian(random: () => number, mean = 0, sigma = 1): number {
	validateNormal(mean, sigma);
	const u = random();
	const v = random();
	if (![u, v].every((n) => Number.isFinite(n) && n >= 0 && n < 1)) {
		throw new Error('Random draws must be in [0, 1).');
	}
	return mean + sigma * Math.sqrt(-2 * Math.log1p(-u)) * Math.cos(2 * Math.PI * v);
}

/** Normal CDF approximation (absolute error about 1e-7), sufficient for the displayed percentages. */
export function gaussianCdf(x: number, mean = 0, sigma = 1): number {
	validateNormal(mean, sigma);
	if (Number.isNaN(x)) throw new Error('x cannot be NaN.');
	const z = (x - mean) / sigma;
	if (z === 0) return 0.5;
	if (z === Infinity) return 1;
	if (z === -Infinity) return 0;
	const t = 1 / (1 + 0.2316419 * Math.abs(z));
	const tail =
		gaussianDensity(Math.abs(z)) *
		t *
		(0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
	return z > 0 ? 1 - tail : tail;
}

export function intervalProbability(low: number, high: number, mean = 0, sigma = 1): number {
	if (low > high) throw new Error('Interval bounds must be ordered.');
	return Math.max(0, Math.min(1, gaussianCdf(high, mean, sigma) - gaussianCdf(low, mean, sigma)));
}

/** Density normalization uses ALL draws, including those beyond the plotted window. */
export function densityHistogram(samples: number[], low: number, high: number, bins = 40) {
	if (
		!Number.isFinite(low) ||
		!Number.isFinite(high) ||
		high <= low ||
		!Number.isInteger(bins) ||
		bins < 1
	)
		throw new Error('Invalid histogram bounds.');
	const width = (high - low) / bins;
	const counts = Array<number>(bins).fill(0);
	let outside = 0;
	for (const value of samples) {
		if (!Number.isFinite(value)) throw new Error('Samples must be finite.');
		if (value < low || value > high) outside++;
		else counts[Math.min(bins - 1, Math.floor((value - low) / width))]++;
	}
	return {
		counts,
		density: counts.map((n) => (samples.length ? n / (samples.length * width) : 0)),
		width,
		outside
	};
}

/** Raising a Gaussian density to 1/T and renormalizing multiplies its variance by T. */
export function temperatureSigma(sigma: number, temperature: number): number {
	validateNormal(0, sigma);
	if (!Number.isFinite(temperature) || temperature <= 0)
		throw new Error('Temperature must be positive.');
	return sigma * Math.sqrt(temperature);
}

/** Mulberry32: reproducible classroom experiments, not a security generator. */
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
