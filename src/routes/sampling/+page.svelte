<script lang="ts">
	import { page } from '$app/state';
	import GaussianPlot from '$lib/components/sampling/GaussianPlot.svelte';
	import {
		intervalProbability,
		sampleGaussian,
		seededRandom,
		temperatureSigma
	} from '$lib/sampling';

	let mean = $state(0);
	let sigma = $state(1);
	let samples = $state<number[]>([]);
	const observedMean = $derived(
		samples.length ? samples.reduce((sum, x) => sum + x, 0) / samples.length : null
	);
	const observedSigma = $derived(
		samples.length > 1 && observedMean !== null
			? Math.sqrt(
					samples.reduce((sum, x) => sum + (x - observedMean) ** 2, 0) / (samples.length - 1)
				)
			: null
	);
	function changeDistribution(kind: 'mean' | 'sigma', value: number) {
		if (kind === 'mean') mean = value;
		else sigma = value;
		samples = [];
	}
	function draw(amount: number) {
		if (samples.length + amount > 10_000) return;
		samples = [
			...samples,
			...Array.from({ length: amount }, () => sampleGaussian(Math.random, mean, sigma))
		];
	}

	let lower = $state(-1);
	let upper = $state(1);
	const area = $derived(intervalProbability(lower, upper));
	let monteCarloSamples = $state<number[]>([]);
	const hits = $derived(monteCarloSamples.filter((x) => x >= -1 && x <= 1).length);
	const estimate = $derived(monteCarloSamples.length ? hits / monteCarloSamples.length : null);
	const referenceArea = intervalProbability(-1, 1);
	function runTrials(amount: number) {
		if (monteCarloSamples.length + amount > 100_000) return;
		monteCarloSamples = [
			...monteCarloSamples,
			...Array.from({ length: amount }, () => sampleGaussian(Math.random))
		];
	}
	let temperature = $state(1);
	let seed = $state(2026);
	let standardDraw = $state<number | null>(null);
	const warmSigma = $derived(temperatureSigma(1, temperature));
	const adjustedDraw = $derived(standardDraw === null ? null : standardDraw * warmSigma);
	const markers = $derived(
		standardDraw === null || adjustedDraw === null
			? []
			: [
					{ value: standardDraw, kind: 'base' as const },
					{ value: adjustedDraw, kind: 'adjusted' as const }
				]
	);
	const validSeed = $derived(Number.isInteger(seed) && seed >= 0 && seed <= 4294967295);
	function replay() {
		if (validSeed) standardDraw = sampleGaussian(seededRandom(seed));
	}
	const display = (n: number | null) => (n === null ? '—' : n.toFixed(3));
	const backHref = $derived.by(() => {
		const lab = page.url.searchParams.get('lab');
		const slide = page.url.searchParams.get('slide');
		return lab && /^\d+$/.test(lab)
			? `/lab/${lab}${slide && /^\d+$/.test(slide) ? `?s=${slide}` : ''}`
			: '/lab';
	});
</script>

<svelte:head>
	<title>Gaussian sampling · Pandaemonium Architecture</title>
	<meta
		name="description"
		content="Draw from a bell curve. Watch samples build a histogram, explore probability as area, and change a Gaussian distribution’s mean and spread."
	/>
</svelte:head>

<article class="sampling mx-auto max-w-4xl px-5 pb-20 sm:px-8">
	<a class="back" href={backHref}>← Back to the lab</a>
	<header>
		<h1>Gaussian sampling</h1>
		<p class="lede">
			A Gaussian, or normal distribution, is the familiar bell curve. It describes how values are
			distributed around a center. Sampling produces one value at a time. Draw enough values and
			their collective shape starts to resemble the curve.
		</p>
	</header>
	<nav class="contents" aria-label="Gaussian experiments">
		<a href="#gaussian">Draw from the curve</a>
		<a href="#area">Probability is area</a>
		<a href="#monte-carlo">Monte Carlo</a>
		<a href="#temperature">Change the spread</a>
	</nav>

	<section id="gaussian">
		<h2>Draw from the curve</h2>
		<p>
			The <strong>mean μ</strong> moves the center. The <strong>standard deviation σ</strong> controls
			the spread. Values near the center are denser; values far out in the tails are less common. A sample
			can land on either side.
		</p>
		<div class="experiment">
			<div class="controls">
				<label
					>Mean μ <output>{mean.toFixed(1)}</output><input
						aria-label="Mean"
						type="range"
						min="-2"
						max="2"
						step="0.1"
						value={mean}
						oninput={(e) => changeDistribution('mean', Number(e.currentTarget.value))}
					/></label
				>
				<label
					>Standard deviation σ <output>{sigma.toFixed(1)}</output><input
						aria-label="Standard deviation"
						type="range"
						min="0.2"
						max="2"
						step="0.1"
						value={sigma}
						oninput={(e) => changeDistribution('sigma', Number(e.currentTarget.value))}
					/></label
				>
			</div>
			<div class="legend">
				<span class="curve-key">Theoretical density</span><span class="hist-key"
					>Observed histogram</span
				>
			</div>
			<GaussianPlot
				{mean}
				{sigma}
				{samples}
				label={`Gaussian density with mean ${mean.toFixed(1)} and standard deviation ${sigma.toFixed(1)}; ${samples.length} sampled values`}
			/>
			<div class="actions">
				{#each [1, 20, 1000] as amount}<button
						disabled={samples.length + amount > 10_000}
						onclick={() => draw(amount)}>Draw {amount.toLocaleString()}</button
					>{/each}<button class="quiet" disabled={!samples.length} onclick={() => (samples = [])}
					>Clear samples</button
				>
			</div>
			<div class="readouts" aria-live="polite">
				<p>Draws<strong>{samples.length.toLocaleString()}</strong></p>
				<p>Latest value<strong>{display(samples.at(-1) ?? null)}</strong></p>
				<p>Sample mean<strong>{display(observedMean)}</strong></p>
				<p>Sample SD<strong>{display(observedSigma)}</strong></p>
			</div>
			<p class="small">
				Changing μ or σ clears the samples. The horizontal scale stays fixed; the vertical scale
				fits the curve and bars. The Gaussian continues beyond the visible window: off-screen draws
				are counted, never clipped into the histogram.
			</p>
		</div>
		<p class="takeaway">
			Start with a single draw, then twenty, then a thousand. The histogram is what happened. The
			curve is the distribution we sampled from. An uneven batch does not mean the distribution
			changed.
		</p>
		<details>
			<summary>Does a value below the mean make a value above it due?</summary>
			<p>
				No. These draws are independent and the distribution stays fixed until you move a control.
				Sampling does not compensate for previous outcomes. The sample mean tends toward μ over many
				draws, but it need not move closer after every new draw.
			</p>
		</details>
	</section>

	<section id="area">
		<h2>Probability is area</h2>
		<p>
			A bell curve shows <strong>probability density</strong>. To ask for a probability, choose an
			interval: what is the chance that a draw falls between these two values? The answer is the
			area under the curve between them.
		</p>
		<div class="experiment">
			<p class="plot-label">Standard normal / μ = 0, σ = 1</p>
			<GaussianPlot
				low={-4}
				high={4}
				interval={[lower, upper]}
				label={`Standard Gaussian with the interval ${lower.toFixed(1)} to ${upper.toFixed(1)} shaded; probability ${(area * 100).toFixed(2)} percent`}
			/>
			<div class="controls">
				<label
					>Lower bound <output>{lower.toFixed(1)}</output><input
						aria-label="Lower bound"
						type="range"
						min="-4"
						max="4"
						step="0.1"
						value={lower}
						oninput={(e) => (lower = Math.min(Number(e.currentTarget.value), upper))}
					/></label
				><label
					>Upper bound <output>{upper.toFixed(1)}</output><input
						aria-label="Upper bound"
						type="range"
						min="-4"
						max="4"
						step="0.1"
						value={upper}
						oninput={(e) => (upper = Math.max(Number(e.currentTarget.value), lower))}
					/></label
				>
			</div>
			<div class="actions">
				{#each [1, 2, 3] as spread}<button
						class="quiet"
						aria-pressed={lower === -spread && upper === spread}
						onclick={() => {
							lower = -spread;
							upper = spread;
						}}>Within {spread}σ</button
					>{/each}
			</div>
			<p class="area-result" aria-live="polite">
				<span>P({lower.toFixed(1)} ≤ X ≤ {upper.toFixed(1)})</span><strong
					>{(area * 100).toFixed(2)}%</strong
				><span>of the total area</span>
			</p>
		</div>
		<p class="takeaway">
			About 68% of this distribution lies within one standard deviation of the mean; about 95%
			within two. These are long-run proportions, not a promise about the next twenty draws.
		</p>
		<details>
			<summary>What about the chance of exactly one value?</summary>
			<p>
				In an ideal continuous Gaussian, a single exact value has probability zero: it occupies no
				width. An interval can have positive probability. The displayed sample is rounded, so a
				displayed value such as 0.100 stands for a small range of values. Computer-generated numbers
				have finite precision too.
			</p>
			<p>
				The entire area is 1. A narrow curve is taller so that its area stays the same. Density can
				exceed 1; probability cannot. Not every real-world distribution is Gaussian—we chose this
				one so its rule is visible.
			</p>
		</details>
	</section>

	<section id="monte-carlo">
		<h2>Monte Carlo</h2>
		<p>
			Monte Carlo methods use repeated random samples to estimate a quantity. We already know the
			area between −1 and 1 under a standard Gaussian. Now estimate it by drawing values and
			counting how many fall inside that interval.
		</p>
		<p>Estimated probability = draws inside the interval ÷ total draws.</p>
		<div class="experiment">
			<p class="plot-label">Standard normal / fixed interval −1 to 1</p>
			<GaussianPlot
				low={-4}
				high={4}
				interval={[-1, 1]}
				samples={monteCarloSamples}
				label={`Monte Carlo estimate of Gaussian interval probability: ${hits} of ${monteCarloSamples.length} draws inside −1 to 1`}
			/>
			<div class="actions">
				<button onclick={() => runTrials(10)} disabled={monteCarloSamples.length + 10 > 100_000}
					>Run 10 trials</button
				>
				<button onclick={() => runTrials(1000)} disabled={monteCarloSamples.length + 1000 > 100_000}
					>Run 1,000 trials</button
				>
				<button
					onclick={() => runTrials(10_000)}
					disabled={monteCarloSamples.length + 10_000 > 100_000}>Run 10,000 trials</button
				>
				<button
					class="quiet"
					onclick={() => (monteCarloSamples = [])}
					disabled={!monteCarloSamples.length}>Reset trials</button
				>
			</div>
			<p aria-live="polite">
				{hits.toLocaleString()} inside / {monteCarloSamples.length.toLocaleString()} total draws
			</p>
			<div class="readouts three" aria-live="polite">
				<p>
					Estimate<strong>{estimate === null ? '—' : `${(estimate * 100).toFixed(2)}%`}</strong>
				</p>
				<p>Calculated area<strong>{(referenceArea * 100).toFixed(2)}%</strong></p>
				<p>
					Absolute error<strong
						>{estimate === null
							? '—'
							: `${(Math.abs(estimate - referenceArea) * 100).toFixed(2)} pp`}</strong
					>
				</p>
			</div>
			<p class="small">
				Trials accumulate until you reset. Error is in percentage points. Every draw counts,
				including those outside the plot.
			</p>
		</div>
		<p>
			Try ten trials, then a thousand. Reset and repeat. The estimate changes from run to run.
			Larger samples usually make it more stable, but each new batch can move it closer to or
			farther from the calculated area. For independent trials like these, typical error shrinks in
			proportion to 1/√N: about four times as many trials to halve it.
		</p>
		<details>
			<summary>Why estimate an area we can calculate?</summary>
			<p>
				Here the calculated area lets us check the method. Monte Carlo is useful when a direct
				calculation is difficult but we can simulate outcomes. The Monty Hall simulation is another
				example: simulate games and count wins to estimate a strategy’s win rate.
			</p>
			<p>
				A sample produces one outcome. A Monte Carlo estimate combines many outcomes to answer a
				question. More trials reduce random error; they cannot correct the wrong simulation rules or
				a distribution that poorly represents the situation.
			</p>
		</details>
	</section>

	<section id="temperature">
		<h2>Change the spread</h2>
		<p>
			Keep the center at zero. Sample a standard Gaussian value z, then reuse it as the curve widens
			or narrows. This lets us change the distribution without also changing the random input.
		</p>
		<div class="experiment">
			<div class="legend">
				<span class="hist-key">Original σ = 1 · dashed</span><span class="curve-key"
					>Adjusted σ = {warmSigma.toFixed(3)} · solid</span
				>
			</div>
			<GaussianPlot
				sigma={warmSigma}
				compareSigma={1}
				{markers}
				label={`Gaussian temperature comparison: original standard deviation 1, adjusted standard deviation ${warmSigma.toFixed(3)}. Temperature ${temperature.toFixed(2)}.`}
			/>
			<label class="temperature"
				>Temperature T <output>{temperature.toFixed(2)}</output><input
					aria-label="Temperature"
					type="range"
					min="0.25"
					max="3"
					step="0.05"
					bind:value={temperature}
				/></label
			>
			<div class="actions">
				<label class="seed"
					>Seed <input
						aria-label="Gaussian seed"
						type="number"
						min="0"
						max="4294967295"
						step="1"
						bind:value={seed}
						oninput={() => (standardDraw = null)}
					/></label
				><button disabled={!validSeed} onclick={replay}
					>{standardDraw === null ? 'Draw a value' : 'Replay this seed'}</button
				><button
					class="quiet"
					onclick={() => {
						seed = (seed + 1) >>> 0;
						replay();
					}}>Try the next seed</button
				>
			</div>
			<div class="readouts three" aria-live="polite">
				<p>Original draw z<strong class="compare-value">{display(standardDraw)}</strong></p>
				<p>Adjusted draw √T · z<strong class="curve-value">{display(adjustedDraw)}</strong></p>
				<p>Always pick the peak<strong>0.000</strong></p>
			</div>
			<p class="small">
				The blue dot is the original draw; the gold dot is the adjusted draw. Values beyond the
				plotted range still appear in the readout. Replaying a seed reproduces z. Moving temperature
				reuses that same z.
			</p>
		</div>
		<p class="takeaway">
			Lower temperature concentrates the Gaussian around its mean. Higher temperature spreads it
			out. Always choosing the peak gives zero every time, which does not reproduce the bell-shaped
			distribution.
		</p>
		<details>
			<summary>Why √T rather than T?</summary>
			<p>
				For this experiment, temperature means raising a density to the power 1/T and renormalizing
				it. For a Gaussian this leaves the mean unchanged and multiplies the variance by T. Standard
				deviation is the square root of variance, so the new spread is σ√T. We keep T positive; T =
				0 is not a Gaussian density with positive width.
			</p>
			<p>
				Language-model temperature uses the same idea of reshaping relative likelihoods, but its
				distribution is over discrete tokens, not a bell curve over numbers. Diffusion models use
				Gaussian noise directly. Not every control called “temperature” in an image tool has this
				exact meaning.
			</p>
		</details>
	</section>

	<section class="bridge">
		<h2>From numbers to tokens</h2>
		<p>
			A Gaussian makes the distinction visible: the curve can stay exactly the same while every draw
			is different. A language model has many possible next tokens instead of a continuous axis. Its
			selected token becomes part of the context for the next prediction, so the distribution can
			change after every step.
		</p>
		<p>
			In diffusion, Gaussian samples supply noise. In Nekhen’s <strong>The Next Word</strong>, the
			class constructs a distribution over candidate words. The shared question is: what
			possibilities were available before this one outcome appeared?
		</p>
		<a href="/denoise">Explore Gaussian noise in Denoise →</a>
	</section>
	<footer>
		Reference: <a href="https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm"
			>NIST’s normal distribution handbook</a
		>. Interval areas are numerical approximations. These experiments use an explicit distribution,
		not a trained model.
	</footer>
</article>

<style>
	.sampling {
		--gauss-curve: #d9b56f;
		--gauss-compare: #8cc8c1;
		color: var(--color-white);
		line-height: 1.75;
	}
	.back {
		display: inline-block;
		margin-top: 2rem;
		font-size: 0.8rem;
		color: var(--color-muted);
	}
	header {
		padding: 3rem 0 2rem;
	}
	h1,
	h2 {
		font-family: var(--font-serif);
		font-style: normal;
		font-weight: 400;
		color: var(--color-bright);
		line-height: 1.3;
	}
	h1 {
		font-size: 2rem;
		margin: 0 0 1rem;
	}
	h2 {
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	.lede {
		font-size: 1.1rem;
		max-width: 43rem;
	}
	.plot-label {
		font-size: 0.8rem;
		color: var(--color-muted);
	}
	.contents {
		display: flex;
		gap: 1.4rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
		border-top: 1px solid var(--color-rule);
		padding: 1rem 0;
	}
	.contents a {
		color: inherit;
	}
	section {
		padding: 3.5rem 0;
		border-bottom: 1px solid var(--color-rule);
		scroll-margin-top: calc(var(--nav-h) + 1rem);
	}
	section > p {
		margin-bottom: 1.2rem;
	}
	.experiment {
		margin: 1.8rem 0;
		padding: 1.5rem;
		border: 1px solid var(--color-rule);
		background: var(--color-ink);
		border-radius: 6px;
	}
	.controls {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
	label {
		font-size: 0.85rem;
	}
	output {
		float: right;
		font-variant-numeric: tabular-nums;
		color: var(--color-bright);
	}
	input[type='range'] {
		display: block;
		width: 100%;
		margin: 1rem 0;
		accent-color: var(--color-white);
	}
	.small {
		font-size: 0.76rem;
		color: var(--color-muted);
		margin: 1rem 0;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
		margin: 1.5rem 0;
	}
	button {
		font-size: 0.8rem;
		border: 1px solid var(--color-rule);
		padding: 0.6rem 1rem;
		border-radius: 3px;
		color: var(--color-bright);
		cursor: pointer;
		background: var(--color-dark);
	}
	button:hover:not(:disabled),
	button[aria-pressed='true'] {
		border-color: var(--color-bright);
		color: var(--color-bright);
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	button.quiet {
		background: transparent;
		color: var(--color-muted);
	}
	input {
		color: var(--color-bright);
	}
	input[type='number'] {
		border: 1px solid var(--color-rule);
		background: var(--color-black);
		border-radius: 3px;
		padding: 0.5rem;
		max-width: 100%;
	}
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--color-bright);
		outline-offset: 4px;
	}
	.readouts {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		border-top: 1px solid var(--color-rule);
		padding-top: 1rem;
		font-size: 0.65rem;
		color: var(--color-muted);
	}
	.readouts strong {
		display: block;
		font-family: var(--font-mono);
		font-weight: 400;
		font-size: 1.35rem;
		color: var(--color-bright);
		font-variant-numeric: tabular-nums;
	}
	.readouts.three {
		grid-template-columns: repeat(3, 1fr);
	}
	.readouts .compare-value {
		color: var(--gauss-compare);
	}
	.readouts .curve-value {
		color: var(--gauss-curve);
	}
	.legend {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		font-size: 0.7rem;
		margin: 1rem 0;
	}
	.curve-key {
		color: var(--gauss-curve);
	}
	.hist-key {
		color: var(--gauss-compare);
	}
	.curve-key:before,
	.hist-key:before {
		content: '—';
		margin-right: 0.4rem;
	}
	.takeaway {
		font-family: var(--font-serif);
		font-size: 1.15rem;
	}
	details {
		font-size: 0.9rem;
		color: var(--color-muted);
	}
	summary {
		cursor: pointer;
		color: var(--color-white);
		padding: 0.5rem 0;
	}
	details p {
		margin: 0.7rem 0 1rem;
	}
	.area-result {
		display: flex;
		flex-direction: column;
		text-align: center;
		padding: 0.8rem 0;
		font-size: 0.85rem;
		color: var(--color-muted);
	}
	.area-result strong {
		font-family: var(--font-serif);
		font-size: 3rem;
		font-weight: 400;
		color: var(--gauss-curve);
		line-height: 1.3;
	}
	.seed {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.seed input {
		width: 8rem;
	}
	.temperature {
		display: block;
	}
	.bridge a,
	footer a {
		color: inherit;
		text-decoration: underline;
	}
	footer {
		font-size: 0.75rem;
		color: var(--color-muted);
		padding-top: 2rem;
	}
	:global(html:not(.dark)) .sampling {
		--gauss-curve: #795004;
		--gauss-compare: #24665f;
	}
	@media (max-width: 550px) {
		.experiment {
			padding: 1rem;
		}
		.controls {
			gap: 1rem;
		}
		.readouts {
			grid-template-columns: repeat(2, 1fr);
		}
		.readouts.three {
			grid-template-columns: 1fr;
		}
		.readouts.three p {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.readouts strong {
			font-size: 1.15rem;
		}
		.contents {
			gap: 0.7rem;
			flex-direction: column;
		}
		.legend {
			gap: 0.5rem;
			flex-direction: column;
		}
		section {
			padding: 2.5rem 0;
		}
	}
</style>
