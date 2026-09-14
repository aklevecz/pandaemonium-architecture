<script lang="ts">
	import { page } from '$app/state';
	// One prompt, a thousand draws. The deck's claim is that a prompt does not
	// name an image, it names a distribution — so this page puts the whole
	// sample on screen at once and lets the room filter it.
	//
	// Every bar is a control. Click "pepperoni" and nine hundred of the thousand
	// stay lit; click "single_slice" and nothing does, because in a thousand
	// tries the model never once drew one. The empty filter is the argument.
	import { onMount } from 'svelte';
	import GaussianPlot from '$lib/components/sampling/GaussianPlot.svelte';

	type Item = Record<string, string | boolean> & { id: string };
	type Data = { prompt: string; model: string; n: number; axes: string[]; items: Item[] };

	let data = $state<Data | null>(null);
	let error = $state('');
	// axis -> selected values. Within an axis the selections are OR'd; across
	// axes they are AND'ed, which is the behaviour people expect from facets.
	let filters = $state<Record<string, string[]>>({});
	let lightbox = $state<Item | null>(null);

	onMount(async () => {
		try {
			const res = await fetch('/pizza/labels.json');
			if (!res.ok) throw new Error(`labels.json returned ${res.status}`);
			data = await res.json();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	});

	const items = $derived(data?.items ?? []);
	const axes = $derived(data?.axes ?? []);

	const filtered = $derived(
		items.filter((it) =>
			Object.entries(filters).every(
				([axis, vals]) => vals.length === 0 || vals.includes(String(it[axis]))
			)
		)
	);

	// Bars reflect the current selection, so filtering visibly collapses the
	// other axes. Counting the full set instead would hide that.
	const counts = $derived.by(() => {
		const out: Record<string, [string, number][]> = {};
		for (const axis of axes) {
			const m = new Map<string, number>();
			for (const it of filtered) {
				const v = String(it[axis]);
				m.set(v, (m.get(v) ?? 0) + 1);
			}
			out[axis] = [...m.entries()].sort((a, b) => b[1] - a[1]);
		}
		return out;
	});

	// Every value the schema allows, so values the model never drew still get a
	// row. A category at zero is the most informative thing on the page.
	const allValues = $derived.by(() => {
		const out: Record<string, string[]> = {};
		for (const axis of axes) {
			out[axis] = [...new Set(items.map((it) => String(it[axis])))].sort();
		}
		return out;
	});

	const combos = $derived.by(() => {
		const m = new Map<string, number>();
		for (const it of filtered) m.set(axes.map((a) => String(it[a])).join(' · '), 0);
		for (const it of filtered) {
			const k = axes.map((a) => String(it[a])).join(' · ');
			m.set(k, (m.get(k) ?? 0) + 1);
		}
		return [...m.entries()].sort((a, b) => b[1] - a[1]);
	});

	const entropyBits = $derived.by(() => {
		let total = 0;
		for (const axis of axes) {
			const n = filtered.length;
			if (!n) continue;
			for (const [, c] of counts[axis] ?? []) {
				const p = c / n;
				if (p > 0) total -= p * Math.log2(p);
			}
		}
		return total;
	});

	const activeCount = $derived(Object.values(filters).reduce((a, v) => a + v.length, 0));

	// The categorical axes collapse to almost one image. Brightness does not:
	// it is a continuous measurement, and across a thousand draws it lands on a
	// clean normal. Sampling never stopped happening; it stopped being visible
	// at the level of categories. Filtering narrows the curve live, which is the
	// part worth doing in front of the room.
	const brightness = $derived(
		filtered.map((it) => Number(it.brightness)).filter((v) => Number.isFinite(v))
	);
	const bMean = $derived(
		brightness.length ? brightness.reduce((a, b) => a + b, 0) / brightness.length : 0
	);
	const bSd = $derived(
		Math.max(
			brightness.length > 1
				? Math.sqrt(brightness.reduce((a, v) => a + (v - bMean) ** 2, 0) / brightness.length)
				: 0,
			0.0005 // a floor, so one sample cannot divide the curve by zero
		)
	);
	// The classic normality check: what share actually falls inside 1, 2 and 3
	// standard deviations, against what a Gaussian predicts.
	const within = $derived(
		[1, 2, 3].map((k) =>
			brightness.length
				? brightness.filter((v) => Math.abs(v - bMean) <= k * bSd).length / brightness.length
				: 0
		)
	);
	const NORMAL = [0.683, 0.954, 0.997];

	function toggle(axis: string, value: string) {
		const cur = filters[axis] ?? [];
		filters = {
			...filters,
			[axis]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
		};
	}
	function reset() {
		filters = {};
	}
	function showModal() {
		// Jump straight to the single commonest combination.
		if (!combos.length) return;
		const values = combos[0][0].split(' · ');
		const next: Record<string, string[]> = {};
		axes.forEach((a, i) => (next[a] = [values[i]]));
		filters = next;
	}

	const backHref = $derived.by(() => {
		const lab = page.url.searchParams.get('lab');
		const slide = page.url.searchParams.get('slide');
		return lab ? `/lab/${lab}${slide ? `?s=${slide}` : ''}` : '/';
	});
	const backLabel = $derived(page.url.searchParams.get('lab') ? 'Back to the lab' : 'Back');

	const fmt = (v: string) => v.replace(/_/g, ' ');
</script>

<svelte:head><title>A Thousand Pizzas · Pandaemonium Architecture</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') lightbox = null;
	}}
/>

<div class="mx-auto max-w-7xl px-4 sm:px-6">
	<header class="pt-12 pb-6">
		<a href={backHref} class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; {backLabel}</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">A thousand pizzas</h1>
		<p class="mt-3 max-w-2xl font-serif text-base leading-relaxed text-gray">
			One prompt, typed once and never changed, drawn a thousand times. Each image was then
			categorised by a second model against a fixed schema. The prompt did not name an image. It
			named this.
		</p>
	</header>

	{#if error}
		<p class="border border-rule bg-dark p-4 font-mono text-sm text-muted">
			Could not load the sample: {error}. Run
			<span class="text-light">node scripts/pizza-distribution.mjs</span> then
			<span class="text-light">bash scripts/pizza-thumbs.sh</span>.
		</p>
	{:else if !data}
		<p class="font-mono text-sm text-muted">Loading one thousand pizzas…</p>
	{:else}
		{@const schemaSpace = axes.reduce((a, ax) => a * (allValues[ax]?.length || 1), 1)}
		<!-- The headline numbers. These are the slide. -->
		<div class="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
			{#each [['draws', String(data.n)], ['distinct combinations', String(combos.length)], ['commonest image', combos.length ? `${((combos[0][1] / filtered.length) * 100).toFixed(0)}%` : '—'], ['total entropy', `${entropyBits.toFixed(2)} bits`]] as [label, value]}
				<div class="bg-black px-4 py-3">
					<div class="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</div>
					<div class="mt-1 font-serif text-2xl text-bright tabular-nums">{value}</div>
				</div>
			{/each}
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-2">
			<button
				onclick={showModal}
				class="border border-rule px-3 py-1.5 font-mono text-[11px] tracking-widest text-muted uppercase transition-colors hover:border-white hover:text-white"
				>Show the modal image</button
			>
			<button
				onclick={reset}
				disabled={activeCount === 0}
				class="border border-rule px-3 py-1.5 font-mono text-[11px] tracking-widest text-muted uppercase transition-colors hover:border-white hover:text-white disabled:opacity-40"
				>Reset</button
			>
			<span class="ml-auto font-mono text-xs text-muted tabular-nums">
				showing <span class="text-bright">{filtered.length}</span> of {data.n}
			</span>
		</div>

		<!-- The continuous measurement, next to the categorical bars. -->
		<section class="gauss mt-8 border border-rule">
			<div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-rule px-4 py-3">
				<h2 class="font-mono text-[10px] tracking-widest text-muted uppercase">
					mean brightness of every image in view
				</h2>
				<span class="font-mono text-xs text-muted tabular-nums">
					&mu; <span class="text-bright">{bMean.toFixed(4)}</span>
					&nbsp;&sigma; <span class="text-bright">{bSd.toFixed(4)}</span>
					&nbsp;n <span class="text-bright">{brightness.length}</span>
				</span>
				<span class="ml-auto flex gap-3 font-mono text-[11px] text-muted tabular-nums">
					{#each within as w, i}
						<span>
							&plusmn;{i + 1}&sigma;
							<span class="text-light">{(w * 100).toFixed(1)}%</span>
							<span class="text-muted/60">/ {(NORMAL[i] * 100).toFixed(1)}</span>
						</span>
					{/each}
				</span>
			</div>
			<div class="px-2 py-2">
				<GaussianPlot
					mean={bMean}
					sigma={bSd}
					samples={brightness}
					low={0.25}
					high={0.53}
					label="Distribution of mean image brightness"
				/>
			</div>
			<p class="border-t border-rule px-4 py-3 font-serif text-sm leading-relaxed text-muted">
				Eight categorical axes said these thousand images were nearly the same picture. One
				continuous measurement says they are a normal distribution. The draw did not stop; it moved
				below the resolution of the words.
			</p>
		</section>

		<div class="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
			<!-- Facets -->
			<div class="flex flex-col gap-5">
				{#each axes as axis}
					{@const rows = counts[axis] ?? []}
					{@const n = filtered.length || 1}
					<section>
						<h2 class="font-mono text-[10px] tracking-widest text-muted uppercase">{fmt(axis)}</h2>
						<div class="mt-1.5 flex flex-col">
							{#each allValues[axis] as value}
								{@const c = rows.find(([v]) => v === value)?.[1] ?? 0}
								{@const on = (filters[axis] ?? []).includes(value)}
								<button
									onclick={() => toggle(axis, value)}
									class="group grid grid-cols-[1fr_2.6rem] items-center gap-2 border-b border-rule/50 py-1 text-left transition-colors hover:bg-dark"
									aria-pressed={on}
								>
									<span class="min-w-0">
										<span
											class="block truncate font-mono text-[11px] {on
												? 'text-bright'
												: c === 0
													? 'text-muted/40'
													: 'text-light'}">{fmt(value)}</span
										>
										<span class="mt-0.5 block h-[6px] w-full bg-dark">
											<span
												class="block h-full transition-all {on ? 'bg-white' : 'bg-muted'}"
												style="width:{(c / n) * 100}%"
											></span>
										</span>
									</span>
									<span
										class="text-right font-mono text-[11px] tabular-nums {c === 0
											? 'text-muted/40'
											: 'text-muted'}">{c}</span
									>
								</button>
							{/each}
						</div>
					</section>
				{/each}
			</div>

			<!-- Contact sheet -->
			<div>
				{#if filtered.length === 0}
					<p class="border border-rule bg-dark p-6 font-serif text-base text-gray">
						Nothing matches. In a thousand draws the model never produced this combination, though
						the schema allows it. That absence is not a bug in the filter; it is the shape of the
						distribution.
					</p>
				{:else}
					<div class="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
						{#each filtered as it (it.id)}
							<button
								onclick={() => (lightbox = it)}
								class="block aspect-[240/131] overflow-hidden bg-dark transition-opacity hover:opacity-70"
								title={it.id}
							>
								<img
									src="/pizza/thumbs/{it.id}.jpg"
									alt=""
									loading="lazy"
									decoding="async"
									class="h-full w-full object-cover"
								/>
							</button>
						{/each}
					</div>
				{/if}

				{#if combos.length > 1}
					<div class="mt-6 border-t border-rule pt-3">
						<h2 class="font-mono text-[10px] tracking-widest text-muted uppercase">
							combinations in view
						</h2>
						<div class="mt-2 flex flex-col gap-1">
							{#each combos.slice(0, 6) as [k, c]}
								<div class="flex gap-3 font-mono text-[11px]">
									<span class="w-10 text-right text-bright tabular-nums">{c}&times;</span>
									<span class="text-muted">{fmt(k)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<p
			class="mt-10 max-w-2xl border-t border-rule pt-4 font-serif text-sm leading-relaxed text-muted"
		>
			The schema can express {schemaSpace.toLocaleString()} different images. These thousand draws visited
			{combos.length === 1 ? 'one' : combos.length} of them. Worth saying aloud: the categoriser is itself
			a model working from a closed list someone wrote, so some of this uniformity could be the categories
			being too coarse rather than the images being identical. The grid is here so you can check by eye.
		</p>
	{/if}
</div>

{#if lightbox}
	<button
		class="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/95 p-6"
		onclick={() => (lightbox = null)}
		aria-label="Close"
	>
		<div class="flex max-h-full flex-col items-center gap-3">
			<img
				src="/pizza/large/{lightbox.id}.jpg"
				alt=""
				class="max-h-[75vh] w-auto max-w-full border border-rule"
			/>
			<div class="flex flex-wrap justify-center gap-1.5">
				{#each axes as axis}
					<span class="border border-rule px-2 py-0.5 font-mono text-[10px] text-muted">
						{fmt(axis)}: <span class="text-light">{fmt(String(lightbox[axis]))}</span>
					</span>
				{/each}
			</div>
			<span class="font-mono text-[10px] text-muted">{lightbox.id} · click anywhere to close</span>
		</div>
	</button>
{/if}

<style>
	/* GaussianPlot paints its curve and bins from these two custom properties.
	   Only the /sampling page defined them, so on this page the stroke resolved
	   to none and the bins to black-on-black: correct geometry, invisible ink.
	   Same values that page uses, so the two demos read as one family. */
	.gauss {
		--gauss-curve: #d9b56f;
		--gauss-compare: #8cc8c1;
	}
	:global(html:not(.dark)) .gauss {
		--gauss-curve: #795004;
		--gauss-compare: #24665f;
	}
</style>
