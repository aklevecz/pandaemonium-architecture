<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';

	let { data } = $props();
	const people = data.people;

	// Most names appear once, in a citation. Ranking by mentions puts the
	// people the readings actually discuss first; A–Z is there for lookup.
	type Sort = 'mentions' | 'az';
	const PAGE = 120;
	const QUICK_TYPES = 6;

	const allTypes = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const p of people) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	});
	const quickTypes = $derived(allTypes.slice(0, QUICK_TYPES).map(([t]) => t));

	let typeFilter = $state(browser ? (page.url.searchParams.get('type') ?? '') : '');
	let sort = $state<Sort>(browser && page.url.searchParams.get('sort') === 'az' ? 'az' : 'mentions');
	let query = $state('');
	let shown = $state(PAGE);

	const frequent = people.filter((p) => p.mentionCount >= 5).length;
	const maxMentions = Math.max(1, ...people.map((p) => p.mentionCount));

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const rows = people
			.filter((p) => (typeFilter ? p.type === typeFilter : true))
			.filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
		return sort === 'az'
			? rows.sort((a, b) => a.name.localeCompare(b.name))
			: rows.sort((a, b) => b.mentionCount - a.mentionCount || a.name.localeCompare(b.name));
	});

	// Changing what is listed starts the list from the top again.
	$effect(() => {
		void typeFilter;
		void sort;
		void query;
		shown = PAGE;
	});

	const visible = $derived(sort === 'az' ? filtered : filtered.slice(0, shown));

	const grouped = $derived.by(() => {
		const map = new Map<string, typeof people>();
		for (const p of visible) {
			// File Émile under E rather than #: strip accents before taking the letter.
			const first = (p.name[0] ?? '#')
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.toUpperCase();
			const key = /[A-Z]/.test(first) ? first : '#';
			const arr = map.get(key) ?? [];
			arr.push(p);
			map.set(key, arr);
		}
		return [...map.entries()].sort();
	});

	const years = (p: (typeof people)[number]) =>
		p.birthYear && p.deathYear
			? `${p.birthYear}–${p.deathYear}`
			: p.birthYear
				? `b. ${p.birthYear}`
				: '';

	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
</script>

<svelte:head>
	<title>People · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 sm:px-6">
	<header class="pt-12 pb-6">
		<a href="/" class="text-xs text-muted uppercase transition-colors hover:text-white">&larr; Back</a>
		<div class="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
			<h1 class="font-serif text-4xl font-normal text-bright">People</h1>
			<a
				href="/people/network"
				class="text-xs tracking-wide text-muted uppercase no-underline transition-colors hover:text-white"
				>View as network &rarr;</a
			>
		</div>
		<p class="mt-3 max-w-2xl font-serif text-base leading-relaxed text-gray">
			{people.length.toLocaleString()} people named across the readings. Most appear once, in a citation;
			{frequent} appear five or more times.
		</p>
	</header>

	<!-- Controls stay reachable while scrolling a long list. -->
	<div
		class="sticky z-20 -mx-4 border-y border-rule bg-black/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
		style="top: var(--nav-h, 57px)"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<input
				type="search"
				bind:value={query}
				placeholder="Search names…"
				aria-label="Search names"
				class="min-w-0 flex-1 border border-rule bg-dark px-3 py-2 text-base text-white outline-none placeholder:text-muted focus:border-muted sm:text-sm"
			/>
			<div class="flex min-w-0 items-center gap-2">
				<div class="flex shrink-0 border border-rule" role="group" aria-label="Sort">
					{#each [['mentions', 'Most mentioned'], ['az', 'A–Z']] as [value, label] (value)}
						<button
							onclick={() => (sort = value as Sort)}
							aria-pressed={sort === value}
							class="px-3 py-2 text-xs whitespace-nowrap transition-colors {sort === value
								? 'bg-rule/60 text-bright'
								: 'text-muted hover:text-light'}">{label}</button
						>
					{/each}
				</div>
				<select
					bind:value={typeFilter}
					aria-label="Filter by type"
					class="w-full min-w-0 border border-rule bg-dark px-2 py-2 text-base text-light capitalize outline-none focus:border-muted sm:w-auto sm:text-xs"
				>
					<option value="">All types</option>
					{#each allTypes as [t, n] (t)}
						<option value={t}>{t} ({n})</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-1 text-xs">
			<button
				onclick={() => (typeFilter = '')}
				class="rounded px-2 py-0.5 transition-colors {typeFilter === ''
					? 'bg-rule/60 text-bright'
					: 'text-muted hover:text-light'}">All</button
			>
			{#each quickTypes as t (t)}
				<button
					onclick={() => (typeFilter = typeFilter === t ? '' : t)}
					class="rounded px-2 py-0.5 capitalize transition-colors {typeFilter === t
						? 'bg-rule/60 text-bright'
						: 'text-muted hover:text-light'}">{t}</button
				>
			{/each}
			{#if typeFilter && !quickTypes.includes(typeFilter)}
				<span class="rounded bg-rule/60 px-2 py-0.5 text-bright capitalize">{typeFilter}</span>
			{/if}
			<span class="ml-auto font-mono text-muted tabular-nums">
				{plural(filtered.length, 'person', 'people')}
			</span>
		</div>
	</div>

	<section class="pt-6 pb-24">
		{#if filtered.length === 0}
			<p class="py-8 text-sm text-muted">No one matches.</p>
		{:else if sort === 'mentions'}
			<ol class="divide-y divide-rule/40">
				{#each visible as p, i (p.slug)}
					<li>
						<a
							href="/people/{p.slug}"
							class="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 py-2.5 no-underline"
						>
							<span class="text-right font-mono text-xs text-muted tabular-nums">{i + 1}</span>
							<span class="min-w-0">
								<span class="block truncate font-serif text-base text-light transition-colors group-hover:text-bright"
									>{p.name}</span
								>
								<span class="block truncate text-xs text-muted">
									<span class="capitalize">{p.type}</span>{#if years(p)}&nbsp;· {years(p)}{/if}
								</span>
							</span>
							<span class="flex w-24 flex-col items-end gap-1 sm:w-48">
								<!-- Phones get the mention count alone so long names keep their room. -->
								<span class="font-mono text-[11px] whitespace-nowrap text-muted tabular-nums">
									{plural(p.mentionCount, 'mention', 'mentions')}<span class="hidden sm:inline">
										· {plural(p.readingCount, 'reading', 'readings')}</span
									>
								</span>
								<span class="block h-[3px] w-full bg-dark">
									<span
										class="block h-full bg-muted transition-colors group-hover:bg-light"
										style="width:{Math.max(2, (p.mentionCount / maxMentions) * 100)}%"
									></span>
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ol>
			{#if filtered.length > shown}
				<div class="mt-6 flex justify-center">
					<button
						onclick={() => (shown += PAGE)}
						class="border border-rule px-4 py-2 text-xs tracking-wide text-muted uppercase transition-colors hover:border-muted hover:text-white"
					>
						Show more ({(filtered.length - shown).toLocaleString()} left)
					</button>
				</div>
			{/if}
		{:else}
			<nav class="mb-6 flex flex-wrap gap-1" aria-label="Jump to letter">
				{#each grouped as [letter] (letter)}
					<a
						href="#letter-{letter}"
						class="min-w-6 border border-rule px-1 py-1 text-center font-mono text-xs text-muted no-underline transition-colors hover:border-muted hover:text-white"
						>{letter}</a
					>
				{/each}
			</nav>
			{#each grouped as [letter, group] (letter)}
				<div id="letter-{letter}" class="mb-8 scroll-mt-44">
					<p class="mb-2 border-b border-rule pb-1 font-mono text-xs text-muted uppercase">
						{letter} <span class="text-muted/60">{group.length}</span>
					</p>
					<div class="grid gap-x-8 sm:grid-cols-2">
						{#each group as p (p.slug)}
							<a
								href="/people/{p.slug}"
								class="group flex items-baseline justify-between gap-3 border-b border-rule/30 py-2 no-underline hover:border-rule"
							>
								<span class="min-w-0 truncate">
									<span class="font-serif text-sm text-light transition-colors group-hover:text-bright"
										>{p.name}</span
									>
									<span class="ml-1.5 text-xs text-muted capitalize">{p.type}</span>
								</span>
								<span
									class="shrink-0 font-mono text-xs text-muted tabular-nums"
									title={plural(p.mentionCount, 'mention', 'mentions')}>{p.mentionCount}</span
								>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</section>
</div>
