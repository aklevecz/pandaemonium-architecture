<script lang="ts">
	// Two measures that differ by orders of magnitude from each other and
	// within themselves, so: two charts that share a row order, never one
	// chart with two axes. Linear is the default because it is the honest
	// picture (Stable Diffusion's bar is too short to draw); log is there to
	// make the early models readable.
	import { page } from '$app/state';
	import {
		models,
		SOURCES,
		RUNNING_COST_METHOD,
		type Measure,
		type ScaleModel
	} from '$lib/data/model-scale';

	type Key = 'params' | 'compute' | 'memory' | 'hardware' | 'response';
	let scale = $state<'linear' | 'log'>('linear');
	let tip = $state<{ m: ScaleModel; key: Key; x: number; y: number } | null>(null);

	// `group` opens a new section heading above the panel that carries it.
	const PANELS: { key: Key; title: string; unit: string; floor: number; group?: string }[] = [
		{ key: 'params', title: 'Parameters', unit: 'numbers in the model', floor: 1e8, group: 'Making it' },
		{ key: 'compute', title: 'Training compute', unit: 'arithmetic operations (FLOP)', floor: 1e21 },
		{ key: 'memory', title: 'Memory to run one copy', unit: 'fast memory, our estimate', floor: 1, group: 'Running it' },
		{ key: 'hardware', title: 'Hardware to hold one copy', unit: 'purchase price, our estimate', floor: 100 },
		{ key: 'response', title: 'Price of one response', unit: 'what the user pays, our estimate', floor: 1e-4 }
	];
	const base = models[0];

	const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
	const sup = (n: number) => String(n).replace(/\d/g, (d) => SUP[Number(d)]);
	function fmtParams(v: number) {
		if (v >= 1e12) return `${+(v / 1e12).toFixed(1)}T`;
		if (v >= 1e9) return `${+(v / 1e9).toFixed(v < 1e10 ? 1 : 0)}B`;
		return `${Math.round(v / 1e6)}M`;
	}
	function fmtCompute(v: number) {
		const e = Math.floor(Math.log10(v));
		const m = +(v / 10 ** e).toFixed(1);
		return m === 1 ? `10${sup(e)}` : `${m} × 10${sup(e)}`;
	}
	function fmtMemory(gb: number) {
		return gb >= 1000 ? `${+(gb / 1000).toFixed(1)} TB` : `${+gb.toFixed(gb < 10 ? 1 : 0)} GB`;
	}
	function fmtDollars(v: number) {
		if (v >= 1e6) return `$${+(v / 1e6).toFixed(1)}M`;
		if (v >= 1e3) return `$${+(v / 1e3).toFixed(v < 1e4 ? 1 : 0)}K`;
		if (v >= 1) return `$${+v.toFixed(2)}`;
		// Under a dollar: keep two significant digits, so $0.0035 is not $0.00.
		return `$${Number(v.toPrecision(2))}`;
	}
	const FORMAT: Record<Key, (v: number) => string> = {
		params: fmtParams,
		compute: fmtCompute,
		memory: fmtMemory,
		hardware: fmtDollars,
		response: fmtDollars
	};
	const fmt = (key: Key, v: number) => FORMAT[key](v);
	function times(key: Key, v: number) {
		const ratio = v / base[key]!.value;
		if (ratio < 1.5) return '';
		const r = ratio >= 100 ? Math.round(ratio / 10 ** (Math.floor(Math.log10(ratio)) - 1)) * 10 ** (Math.floor(Math.log10(ratio)) - 1) : Math.round(ratio);
		return `${r.toLocaleString()}× SD 1.5`;
	}

	function domain(key: Key, floor: number) {
		const highs = models.flatMap((m) => (m[key] ? [m[key]!.range?.[1] ?? m[key]!.value] : []));
		const max = Math.max(...highs);
		return scale === 'log' ? { min: floor, max: 10 ** Math.ceil(Math.log10(max)) } : { min: 0, max };
	}
	function frac(v: number, d: { min: number; max: number }) {
		if (scale === 'log') return (Math.log10(v) - Math.log10(d.min)) / (Math.log10(d.max) - Math.log10(d.min));
		return v / d.max;
	}
	function ticks(key: Key, d: { min: number; max: number }) {
		if (scale === 'log') {
			const out: number[] = [];
			const step = key === 'compute' ? 2 : 1;
			for (let e = Math.log10(d.min); e <= Math.log10(d.max); e += step) out.push(10 ** e);
			return out;
		}
		// Round steps (1, 2, 2.5 or 5 times a power of ten) so every tick label
		// is an exact number, never a rounded one.
		const rough = d.max / 4;
		const pow = 10 ** Math.floor(Math.log10(rough));
		const step = [1, 2, 2.5, 5, 10].map((n) => n * pow).find((s) => s >= rough * 0.999)!;
		const out: number[] = [];
		for (let v = 0; v <= d.max * 1.001; v += step) out.push(v);
		return out;
	}
	const BASIS_WORD = { stated: '', estimate: 'est.', projection: 'projected' } as const;
	const BASIS_LONG = {
		stated: 'Stated by the developer',
		estimate: 'Outside estimate',
		projection: 'Projection, not a measurement'
	} as const;

	function show(e: PointerEvent | FocusEvent, m: ScaleModel, key: Key) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = 'clientX' in e && e.clientX ? e.clientX : r.left + 40;
		const y = 'clientY' in e && e.clientY ? e.clientY : r.bottom;
		tip = { m, key, x, y };
	}

	const backHref = $derived.by(() => {
		const lab = page.url.searchParams.get('lab');
		const slide = page.url.searchParams.get('slide');
		return lab ? `/lab/${lab}${slide ? `?s=${slide}` : ''}` : '/';
	});
</script>

<svelte:head><title>Scale · Pandaemonium Architecture</title></svelte:head>

<div class="viz mx-auto max-w-5xl px-4 pb-24 sm:px-6">
	<header class="pt-12 pb-6">
		<a href={backHref} class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; {page.url.searchParams.get('lab') ? 'Back to the lab' : 'Back'}</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Scale</h1>
		<p class="mt-3 max-w-2xl font-serif text-base leading-relaxed text-gray">
			Stable Diffusion 1.5 runs on a laptop. Four years later the largest models hold about three
			thousand times as many numbers, took about ten thousand times as much arithmetic to train,
			and need a rack of hardware that costs millions to run at all. Most of what is known about
			them is an outside estimate.
		</p>
		<p class="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
			Making it is paid once. Running it is paid on every prompt.
		</p>
	</header>

	<!-- One control row, above everything it scopes. -->
	<div class="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-rule py-3">
		<div class="flex border border-rule" role="group" aria-label="Scale">
			{#each [['linear', 'Linear'], ['log', 'Log']] as [value, label] (value)}
				<button
					onclick={() => (scale = value as 'linear' | 'log')}
					aria-pressed={scale === value}
					class="px-3 py-1.5 text-xs transition-colors {scale === value
						? 'bg-rule/60 text-bright'
						: 'text-muted hover:text-light'}">{label}</button
				>
			{/each}
		</div>
		<ul class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted" aria-label="How each bar was measured">
			<li><span class="key stated"></span>Stated by the developer</li>
			<li><span class="key estimate"></span>Outside estimate</li>
			<li><span class="key projection"></span>Projection</li>
		</ul>
	</div>
	<p class="mt-3 text-xs text-muted">
		{#if scale === 'linear'}
			Linear: bar length is proportional to the number. Stable Diffusion's bars are there, and too
			short to see.
		{:else}
			Log: each gridline is ten times the one before it, so a bar twice as long is not twice as
			much. Use it to read the small models, not to compare lengths.
		{/if}
	</p>

	{#each PANELS as panel (panel.key)}
		{@const d = domain(panel.key, panel.floor)}
		{#if panel.group}
			<h2 class="mt-12 border-b border-rule pb-2 text-xs tracking-widest text-muted uppercase">
				{panel.group}
			</h2>
		{/if}
		<section class="panel {panel.group ? 'mt-6' : 'mt-10'}" style="--series: var(--{panel.key})">
			<h3 class="font-serif text-xl text-bright">
				{panel.title}
				<span class="ml-2 font-sans text-xs text-muted">{panel.unit}</span>
			</h3>

			<!-- Phones stack the name above its bar, so the bar gets the full width. -->
			<div class="mt-4 grid grid-cols-1 sm:grid-cols-[minmax(7rem,11rem)_1fr] sm:gap-x-5">
				<!-- Axis -->
				<div class="hidden sm:block"></div>
				<div class="track relative h-5">
					{#each ticks(panel.key, d) as t, ti (t)}
						{@const edge = ti === 0 || ti === ticks(panel.key, d).length - 1}
						<span
							class="{edge ? '' : 'hidden sm:inline'} absolute top-0 -translate-x-1/2 text-[11px] text-muted tabular-nums first:translate-x-0"
							style="left: calc((100% - var(--tip)) * {frac(Math.max(t, d.min || t), d)})"
							>{t === 0 ? '0' : fmt(panel.key, t)}</span
						>
					{/each}
				</div>

				{#each models as m (m.name)}
					{@const v = m[panel.key]}
					<div
						class="flex items-baseline gap-2 border-t border-rule/40 pt-2 sm:min-h-11 sm:flex-col sm:justify-center sm:gap-0 sm:py-1.5"
					>
						<span class="font-serif text-sm leading-tight text-light">{m.name}</span>
						<span class="text-[11px] text-muted">{m.date}</span>
					</div>
					<button
						type="button"
						class="row track relative flex min-h-9 w-full cursor-default items-center text-left sm:min-h-11 sm:border-t sm:border-rule/40"
						aria-label={v
							? `${m.name}, ${panel.title.toLowerCase()}: ${fmt(panel.key, v.value)}. ${BASIS_LONG[v.basis]}.`
							: `${m.name}, ${panel.title.toLowerCase()}: undisclosed.`}
						onpointermove={(e) => show(e, m, panel.key)}
						onpointerleave={() => (tip = null)}
						onfocus={(e) => show(e, m, panel.key)}
						onblur={() => (tip = null)}
					>
						{#each ticks(panel.key, d) as t (t)}
							<span
								class="grid-line"
								style="left: calc((100% - var(--tip)) * {frac(Math.max(t, d.min || t), d)})"
							></span>
						{/each}
						{#if v}
							{#if v.range}
								<span
									class="whisker"
									style="left: calc((100% - var(--tip)) * {frac(v.range[0], d)}); width: calc((100% - var(--tip)) * {frac(
										v.range[1],
										d
									) - frac(v.range[0], d)})"
								></span>
							{/if}
							<span
								class="bar {v.basis}"
								style="width: max(1px, calc((100% - var(--tip)) * {frac(v.value, d)}))"
							></span>
							<!-- A projection's label sits past its whisker, not on top of it. -->
							<span
								class="ml-2 shrink-0 text-xs whitespace-nowrap"
								style={v.range
									? `margin-left: calc((100% - var(--tip)) * ${frac(v.range[1], d) - frac(v.value, d)} + 0.5rem)`
									: undefined}
							>
								<span class="text-bright tabular-nums">{fmt(panel.key, v.value)}</span>
								{#if BASIS_WORD[v.basis]}<span class="text-muted"> {BASIS_WORD[v.basis]}</span>{/if}
								{#if times(panel.key, v.value)}
									<span class="hidden text-muted sm:inline"> · {times(panel.key, v.value)}</span>
								{/if}
							</span>
						{:else}
							<span class="text-xs text-muted italic">undisclosed, and no outside estimate</span>
						{/if}
					</button>
				{/each}
			</div>
		</section>
	{/each}

	<details class="mt-12 border-t border-rule pt-4">
		<summary class="cursor-pointer text-xs tracking-wide text-muted uppercase hover:text-white"
			>The numbers, and where they come from</summary
		>
		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[80rem] border-collapse text-left text-xs">
				<thead class="text-muted">
					<tr class="border-b border-rule">
						<th class="py-2 pr-4 font-normal">Model</th>
						<th class="py-2 pr-4 font-normal">Takes and makes</th>
						{#each PANELS as panel (panel.key)}
							<th class="py-2 pr-4 font-normal">{panel.title}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each models as m (m.name)}
						<tr class="border-b border-rule/40 align-top">
							<td class="py-2 pr-4 text-light">
								{m.name}<br /><span class="text-muted">{m.developer}, {m.date}</span>
							</td>
							<td class="py-2 pr-4 text-muted">{m.modality}</td>
							{#each PANELS as { key } (key)}
								{@const v: Measure | undefined = m[key]}
								<td class="py-2 pr-4 text-muted">
									{#if v}
										<span class="text-light tabular-nums">{fmt(key, v.value)}</span>
										{#if v.range}
											<span class="tabular-nums">
												({fmt(key, v.range[0])} to {fmt(key, v.range[1])})</span
											>{/if}<br />{BASIS_LONG[v.basis]}. {v.note}
									{:else}Undisclosed.{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
			A parameter is one learned number. A FLOP is one arithmetic operation; training compute counts
			every one spent fitting the model. For a mixture-of-experts model only part of the parameters
			run for any one token, which is why Kimi K3 is the largest model here and one of the cheaper
			ones to train.
		</p>
		<ul class="mt-3 max-w-2xl list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted">
			{#each RUNNING_COST_METHOD as line (line)}<li>{line}</li>{/each}
		</ul>
		<p class="mt-3 max-w-2xl text-xs leading-relaxed text-muted">
			Sources:
			{#each SOURCES as s, i (s.href)}
				<a href={s.href} target="_blank" rel="noopener" class="underline hover:text-white">{s.label}</a
				>{i < SOURCES.length - 1 ? '; ' : '.'}
			{/each}
			Checked 20 September 2026.
		</p>
	</details>
</div>

{#if tip}
	{@const v = tip.m[tip.key]}
	<div
		class="tooltip pointer-events-none fixed z-50 w-72 border border-rule bg-dark p-3 text-xs shadow-lg"
		style="left: clamp(8px, {tip.x + 14}px, calc(100vw - 19rem)); top: {tip.y + 16}px"
		role="status"
	>
		{#if v}
			<p class="text-base text-bright tabular-nums">{fmt(tip.key, v.value)}</p>
		{:else}
			<p class="text-base text-bright">Undisclosed</p>
		{/if}
		<p class="mt-0.5 text-light">{tip.m.name} · {tip.m.date}</p>
		<p class="text-muted">{tip.m.developer}</p>
		{#if v}
			<p class="mt-2 text-muted"><span class="text-light">{BASIS_LONG[v.basis]}.</span> {v.note}</p>
		{/if}
		{#if tip.m.aside}<p class="mt-2 text-muted">{tip.m.aside}</p>{/if}
	</div>
{/if}

<style>
	/* Series colours: the dataviz reference palette's first two slots, stepped
	   per mode and checked with its validator against this site's two
	   surfaces (#000 dark, #ece0c2 light). Orange is under 3:1 on the light
	   surface, which the tip labels and the table cover. */
	.viz {
		--params: #3987e5;
		--compute: #d95926;
		--memory: #199e70;
		--hardware: #c98500;
		--response: #d55181;
		--tip: 12rem;
	}
	:global(html:not(.dark)) .viz {
		--params: #2a78d6;
		--compute: #eb6834;
		--memory: #1baf7a;
		--hardware: #eda100;
		--response: #e87ba4;
	}
	@media (max-width: 640px) {
		.viz {
			--tip: 6.5rem;
		}
	}

	.bar {
		display: block;
		height: 22px;
		flex: none;
		border-radius: 0 4px 4px 0;
		background: var(--series);
	}
	.bar.estimate {
		opacity: 0.62;
	}
	/* 45° only: horizontal or vertical stripes read as gridlines or more bars. */
	.bar.projection,
	.key.projection {
		background: repeating-linear-gradient(
			45deg,
			var(--series, var(--color-muted)) 0 3px,
			transparent 3px 7px
		);
		outline: 1px solid var(--series, var(--color-muted));
		outline-offset: -1px;
	}
	.row:hover .bar,
	.row:focus-visible .bar {
		filter: brightness(1.2);
	}
	.row:focus-visible {
		outline: 1px solid var(--color-muted);
		outline-offset: -1px;
	}
	.whisker {
		position: absolute;
		top: 50%;
		height: 1px;
		background: var(--color-muted);
	}
	.whisker::before,
	.whisker::after {
		content: '';
		position: absolute;
		top: -4px;
		height: 9px;
		width: 1px;
		background: var(--color-muted);
	}
	.whisker::after {
		right: 0;
	}
	.grid-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--color-rule);
		opacity: 0.6;
	}
	.bar,
	.row > span:not(.grid-line):not(.whisker) {
		position: relative;
	}
	.key {
		display: inline-block;
		width: 14px;
		height: 10px;
		margin-right: 6px;
		vertical-align: -1px;
		background: var(--color-muted);
	}
	.key.estimate {
		opacity: 0.62;
	}
</style>
