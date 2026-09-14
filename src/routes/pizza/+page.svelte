<script lang="ts">
	import { page } from '$app/state';
	// One prompt, a thousand draws. The deck's claim is that a prompt does not
	// name an image, it names a distribution — so this page puts the whole
	// sample on screen at once and lets the room filter it.
	//
	// Every bar is a control. Click "pepperoni" and nine hundred of the thousand
	// stay lit. Switching prompts shows how far one word moves the distribution.
	import { goto } from '$app/navigation';

	type Item = Record<string, string | boolean> & { id: string };
	type Data = { prompt: string; model: string; n: number; axes: string[]; items: Item[] };

	// Each run lives in static/pizza/<slug>/, built by scripts/pizza-thumbs.sh.
	const RUNS = [
		{ slug: 'pizza', prompt: 'pizza' },
		{ slug: 'a-slice-of-pizza', prompt: 'a slice of pizza' },
		{ slug: 'no-prompt', prompt: '' }
	];

	// Every option each axis allows in scripts/pizza-distribution.mjs. The
	// observed values undercount this, since the model never drew some of them.
	// Pizza runs use the first eight axes; other prompts use the general ones.
	// Axes absent here are booleans.
	const SCHEMA_OPTIONS: Record<string, string[]> = {
		form: ['whole_pizza', 'single_slice', 'multiple_slices', 'other'],
		view: ['top_down', 'three_quarter', 'side', 'macro_closeup'],
		toppings: ['cheese_only', 'pepperoni', 'vegetable', 'mixed_meat', 'seafood', 'other'],
		crust: ['thin', 'thick_pan', 'stuffed', 'neapolitan_charred', 'other'],
		subject: [
			'person',
			'animal',
			'food',
			'plant_or_flower',
			'landscape',
			'building_or_city',
			'interior_room',
			'vehicle',
			'object',
			'abstract_pattern',
			'text_or_graphic',
			'other'
		],
		framing: ['close_up', 'medium', 'wide', 'top_down'],
		light: ['daylight', 'golden_hour', 'night', 'studio', 'not_applicable'],
		palette: ['warm', 'cool', 'neutral', 'vivid_mixed', 'black_and_white']
	};
	// style and setting differ between the two schemas.
	const PIZZA_OPTIONS: Record<string, string[]> = {
		style: ['photograph', 'illustration', 'render_3d', 'other'],
		setting: ['wooden_board', 'plate', 'table', 'isolated_background', 'other']
	};
	const GENERAL_OPTIONS: Record<string, string[]> = {
		style: ['photograph', 'illustration', 'painting', 'render_3d', 'other'],
		setting: ['outdoor_nature', 'outdoor_urban', 'indoor', 'plain_background', 'none']
	};
	const optionsFor = (axis: string, pizza: boolean) =>
		(pizza ? PIZZA_OPTIONS : GENERAL_OPTIONS)[axis] ?? SCHEMA_OPTIONS[axis] ?? ['false', 'true'];
	const promptLabel = (p: string) => (p ? `“${p}”` : 'no prompt');

	const run = $derived(
		RUNS.find((r) => r.slug === page.url.searchParams.get('prompt')) ?? RUNS[0]
	);

	let data = $state<Data | null>(null);
	let error = $state('');
	// axis -> selected values. Within an axis the selections are OR'd; across
	// axes they are AND'ed, which is the behaviour people expect from facets.
	let filters = $state<Record<string, string[]>>({});
	let lightbox = $state<Item | null>(null);

	const cache = new Map<string, Data>();

	$effect(() => {
		const slug = run.slug;
		filters = {};
		lightbox = null;
		error = '';
		const hit = cache.get(slug);
		data = hit ?? null;
		if (hit) return;
		let cancelled = false;
		fetch(`/pizza/${slug}/labels.json`)
			.then((res) => {
				if (!res.ok) throw new Error(`labels.json returned ${res.status}`);
				return res.json();
			})
			.then((d: Data) => {
				cache.set(slug, d);
				if (!cancelled) data = d;
			})
			.catch((err) => {
				if (!cancelled) error = err instanceof Error ? err.message : String(err);
			});
		return () => {
			cancelled = true;
		};
	});

	function choose(slug: string) {
		const url = new URL(page.url);
		if (slug === RUNS[0].slug) url.searchParams.delete('prompt');
		else url.searchParams.set('prompt', slug);
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

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

	// The main chart: toppings for pizza runs, subject for everything else.
	// Every option the schema offers gets a column, in schema order, so an option
	// the model never drew shows as an empty column.
	const isPizza = $derived(axes.includes('toppings'));
	const chartAxis = $derived(isPizza ? 'toppings' : 'subject');
	const TOPPINGS = $derived(optionsFor(chartAxis, isPizza));
	const RANDOM_SHARE = $derived(1 / TOPPINGS.length);
	// Counted with every filter except the chart's own axis, so clicking a column
	// highlights it instead of emptying the others.
	const toppingBase = $derived(
		items.filter((it) =>
			Object.entries(filters).every(
				([axis, vals]) => axis === chartAxis || vals.length === 0 || vals.includes(String(it[axis]))
			)
		)
	);
	const toppingShares = $derived(
		TOPPINGS.map((t) => {
			const n = toppingBase.filter((it) => String(it[chartAxis]) === t).length;
			return { t, n, share: toppingBase.length ? n / toppingBase.length : 0 };
		})
	);
	const toppingMax = $derived(Math.max(...toppingShares.map((s) => s.share), RANDOM_SHARE));
	const toppingTop = $derived([...toppingShares].sort((a, b) => b.n - a.n)[0]);
	const toppingNever = $derived(toppingShares.filter((s) => s.n === 0).map((s) => s.t));
	const toppingBits = $derived(
		toppingShares.reduce((h, s) => (s.share > 0 ? h - s.share * Math.log2(s.share) : h), 0)
	);
	const schemaSpace = $derived(axes.reduce((a, ax) => a * optionsFor(ax, isPizza).length, 1));
	const pct = (p: number) => `${(p * 100).toFixed(p > 0 && p < 0.01 ? 1 : 0)}%`;

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
		<div class="mt-6 flex flex-wrap gap-2" role="group" aria-label="Prompt">
			{#each RUNS as r}
				{@const on = r.slug === run.slug}
				<button
					onclick={() => choose(r.slug)}
					aria-pressed={on}
					class="border px-3 py-1.5 font-serif text-base transition-colors {on
						? 'border-white text-bright'
						: 'border-rule text-muted hover:border-white hover:text-white'}"
					>{promptLabel(r.prompt)}</button
				>
			{/each}
		</div>
	</header>

	{#if error}
		<p class="border border-rule bg-dark p-4 font-mono text-sm text-muted">
			Could not load the sample: {error}. Run
			<span class="text-light">node scripts/pizza-distribution.mjs</span> then
			<span class="text-light">bash scripts/pizza-thumbs.sh {run.slug}</span>.
		</p>
	{:else if !data}
		<p class="font-mono text-sm text-muted">Loading one thousand pizzas…</p>
	{:else}
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

		<!-- Toppings (or subject), against picking one of the options at random. -->
		<section class="dist mt-8 border border-rule">
			<div class="border-b border-rule px-4 py-3">
				<h2 class="font-mono text-[10px] tracking-widest text-muted uppercase">{fmt(chartAxis)}</h2>
			</div>
			<div class="px-4 pt-6">
				<div
					class="grid h-56 items-end gap-2"
					style="grid-template-columns:repeat({TOPPINGS.length},minmax(0,1fr))"
				>
					{#each toppingShares as s}
						{@const on = (filters.toppings ?? []).includes(s.t)}
						<button
							onclick={() => toggle('toppings', s.t)}
							aria-pressed={on}
							aria-label="{fmt(s.t)}: {s.n} {s.n === 1 ? 'image' : 'images'}, {pct(s.share)}"
							class="group relative flex h-full flex-col justify-end"
						>
							<span
								class="mb-1 text-center font-mono text-[11px] tabular-nums {s.n
									? 'text-light'
									: 'text-muted/40'}"
								>{pct(s.share)}{#if TOPPINGS.length <= 6}
									<span class="text-muted">({s.n})</span>{/if}</span
							>
							<span
								class="block w-full transition-all {on
									? 'bg-white'
									: 'bg-muted group-hover:bg-light'}"
								style="height:{(s.share / toppingMax) * 85}%"
							></span>
							<span
								class="baseline pointer-events-none absolute right-0 left-0 border-t-2 border-dashed"
								style="bottom:{(RANDOM_SHARE / toppingMax) * 85}%"
							></span>
						</button>
					{/each}
				</div>
				<div
					class="mt-1 grid gap-2 border-t border-rule pt-1 pb-3"
					style="grid-template-columns:repeat({TOPPINGS.length},minmax(0,1fr))"
				>
					{#each toppingShares as s}
						<span
							class="text-center font-mono text-[11px] {s.n ? 'text-light' : 'text-muted/40'}"
							>{fmt(s.t)}</span
						>
					{/each}
				</div>
			</div>
			<div
				class="flex flex-wrap gap-x-6 gap-y-1 border-t border-rule px-4 py-3 font-mono text-[11px] text-muted"
			>
				<span><span class="mr-1.5 inline-block h-2.5 w-3 bg-muted align-middle"></span>these images</span>
				<span
					><span class="baseline mr-1.5 inline-block w-4 border-t-2 border-dashed align-middle"
					></span>if one {fmt(chartAxis) === 'toppings' ? 'topping' : fmt(chartAxis)} were picked at random ({pct(
						RANDOM_SHARE
					)} each)</span
				>
				<span class="ml-auto tabular-nums"
					>entropy <span class="text-bright">{toppingBits.toFixed(2)}</span> of {Math.log2(
						TOPPINGS.length
					).toFixed(2)} bits</span
				>
			</div>
			{#if toppingTop}
				<p class="border-t border-rule px-4 py-3 font-serif text-sm leading-relaxed text-muted">
					{pct(toppingTop.share)} of these images are labeled {fmt(toppingTop.t)}. Picked at random from the
					{TOPPINGS.length} options, each would come up about {pct(RANDOM_SHARE)} of the time.
					{#if toppingNever.length}
						Never drawn: {toppingNever.map(fmt).join(', ')}.
					{/if}
					Click a column to see those images.
				</p>
			{/if}
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
									src="/pizza/{run.slug}/thumbs/{it.id}.jpg"
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
				src="/pizza/{run.slug}/large/{lightbox.id}.jpg"
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
	/* The random-pick baseline, in the /sampling page's comparison colour. */
	.dist .baseline {
		border-color: #d9b56f;
	}
	:global(html:not(.dark)) .dist .baseline {
		border-color: #795004;
	}
</style>
