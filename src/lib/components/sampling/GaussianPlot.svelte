<script lang="ts">
	import { densityHistogram, gaussianDensity } from '$lib/sampling';
	let {
		mean = 0,
		sigma = 1,
		samples = [],
		interval = null,
		compareSigma = null,
		markers = [],
		low = -8,
		high = 8,
		label = 'Gaussian distribution'
	}: {
		mean?: number;
		sigma?: number;
		samples?: number[];
		interval?: [number, number] | null;
		compareSigma?: number | null;
		markers?: { value: number; kind: 'base' | 'adjusted' }[];
		low?: number;
		high?: number;
		label?: string;
	} = $props();
	let width = $state(640);
	const w = $derived(Math.max(width, 280));
	const left = 46,
		right = 14,
		top = 28,
		bottom = 224;
	const hist = $derived(densityHistogram(samples, low, high));
	const showHist = $derived(samples.length >= 20);
	const latest = $derived(samples.at(-1));
	const ymax = $derived(
		Math.max(
			gaussianDensity(mean, mean, sigma),
			compareSigma ? gaussianDensity(mean, mean, compareSigma) : 0,
			...(showHist ? hist.density : [0])
		) * 1.2
	);
	const sx = (x: number) => left + ((x - low) / (high - low)) * (w - left - right);
	const sy = (y: number) => bottom - (y / ymax) * (bottom - top);
	function curve(s: number, a = low, b = high) {
		return Array.from({ length: 241 }, (_, i) => {
			const x = a + ((b - a) * i) / 240;
			return `${i ? 'L' : 'M'}${sx(x).toFixed(2)},${sy(gaussianDensity(x, mean, s)).toFixed(2)}`;
		}).join(' ');
	}
	const area = $derived.by(() => {
		if (!interval) return '';
		const a = Math.max(low, interval[0]),
			b = Math.min(high, interval[1]);
		if (a >= b) return '';
		return `${curve(sigma, a, b)} L${sx(b)},${bottom} L${sx(a)},${bottom} Z`;
	});
	const ticks = $derived(Array.from({ length: 5 }, (_, i) => low + ((high - low) * i) / 4));
</script>

<div class="plot" bind:clientWidth={width}>
	<svg viewBox={`0 0 ${w} 282`} role="img" aria-label={label}>
		<title>{label}</title>
		<text x={left} y="15" class="axis-label">probability density</text>
		{#each [0, 0.5, 1] as fraction}
			{@const value = ymax * fraction}
			<line x1={left} x2={w - right} y1={sy(value)} y2={sy(value)} class="grid" />
			<text x={left - 8} y={sy(value) + 4} text-anchor="end" class="tick">{value.toFixed(2)}</text>
		{/each}
		{#if area}<path d={area} class="area" />{/if}
		{#if showHist}{#each hist.density as density, i}
				<rect
					x={sx(low + i * hist.width) + 0.5}
					y={sy(density)}
					width={Math.max(0, sx(low + hist.width) - sx(low) - 1)}
					height={bottom - sy(density)}
					class="bin"
				/>
			{/each}{/if}
		{#if compareSigma}<path d={curve(compareSigma)} class="comparison" />{/if}
		<path d={curve(sigma)} class="curve" />
		{#if mean >= low && mean <= high}<line
				x1={sx(mean)}
				x2={sx(mean)}
				y1={sy(gaussianDensity(mean, mean, sigma))}
				y2={bottom}
				class="mean"
			/>{/if}
		{#if interval}{#each interval as edge}{#if edge >= low && edge <= high}<line
						x1={sx(edge)}
						x2={sx(edge)}
						y1={sy(gaussianDensity(edge, mean, sigma))}
						y2={bottom}
						class="edge"
					/>{/if}{/each}{/if}
		{#each samples.slice(-50) as value, i}{#if value >= low && value <= high}<line
					x1={sx(value)}
					x2={sx(value)}
					y1={bottom + 5}
					y2={bottom + 12}
					class="sample"
					class:latest={i === Math.min(samples.length, 50) - 1}
				/>{/if}{/each}
		{#if latest !== undefined && latest >= low && latest <= high}
			<circle cx={sx(latest)} cy={bottom + 8.5} r="4" class="latest-dot" />
		{/if}
		{#each markers as marker}{#if marker.value >= low && marker.value <= high}<circle
					cx={sx(marker.value)}
					cy={bottom + (marker.kind === 'base' ? 9 : 19)}
					r="5"
					class:base-dot={marker.kind === 'base'}
					class:adjusted-dot={marker.kind === 'adjusted'}
				/>{/if}{/each}
		{#each ticks as tick}<text x={sx(tick)} y={bottom + 36} text-anchor="middle" class="tick"
				>{tick.toFixed(0)}</text
			>{/each}
		<text x={w - right} y="277" text-anchor="end" class="axis-label">sample value x</text>
	</svg>
	{#if samples.length}<p class="plot-note">
			Solid dot: latest draw. Ticks: latest {Math.min(samples.length, 50)} draws. {showHist
				? 'Bars: observed density (count ÷ total draws ÷ bin width).'
				: 'The histogram appears after 20 draws.'}
			{hist.outside} of {samples.length.toLocaleString()} draws outside this window.
		</p>{/if}
</div>

<style>
	.plot {
		width: 100%;
		min-width: 0;
	}
	svg {
		display: block;
		width: 100%;
		overflow: visible;
	}
	.grid {
		stroke: var(--color-rule);
		stroke-width: 1;
	}
	.tick,
	.axis-label {
		fill: var(--color-muted);
		font: 11px system-ui;
	}
	.axis-label {
		font-size: 10px;
	}
	.curve {
		fill: none;
		stroke: var(--gauss-curve);
		stroke-width: 2.5;
	}
	.comparison {
		fill: none;
		stroke: var(--gauss-compare);
		stroke-width: 2;
		stroke-dasharray: 6 4;
	}
	.area {
		fill: var(--gauss-curve);
		opacity: 0.2;
	}
	.bin {
		fill: var(--gauss-compare);
		opacity: 0.45;
	}
	.mean {
		stroke: var(--gauss-curve);
		stroke-dasharray: 3 4;
		opacity: 0.5;
	}
	.edge {
		stroke: var(--gauss-curve);
		stroke-width: 1.5;
	}
	.sample {
		stroke: var(--color-muted);
		stroke-width: 1.5;
		opacity: 0.6;
	}
	.sample.latest {
		stroke: var(--color-bright);
		stroke-width: 3;
		opacity: 1;
	}
	.latest-dot {
		fill: var(--color-bright);
	}
	.base-dot {
		fill: var(--gauss-compare);
	}
	.adjusted-dot {
		fill: var(--gauss-curve);
	}
	.plot-note {
		font-size: 0.72rem;
		line-height: 1.6;
		color: var(--color-muted);
		margin: 0.8rem 0 0;
	}
</style>
