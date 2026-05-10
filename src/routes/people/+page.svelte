<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';

	let { data } = $props();
	const people = data.people;

	const allTypes = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const p of people) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	});

	let typeFilter = $state(browser ? page.url.searchParams.get('type') ?? '' : '');
	let query = $state('');

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return people
			.filter((p) => (typeFilter ? p.type === typeFilter : true))
			.filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	const grouped = $derived.by(() => {
		const map = new Map<string, typeof people>();
		for (const p of filtered) {
			const key = p.name[0]?.toUpperCase() ?? '?';
			const arr = map.get(key) ?? [];
			arr.push(p);
			map.set(key, arr);
		}
		return [...map.entries()].sort();
	});
</script>

<svelte:head>
	<title>People · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 sm:px-6">
	<header class="pb-8 pt-12">
		<a href="/" class="text-xs text-muted transition-colors hover:text-white uppercase">&larr; Back</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">People</h1>
		<p class="mt-2 text-xs text-muted">
			{people.length} named persons across the corpus —
			<a href="/people/network" class="underline hover:text-light">view as network &rarr;</a>
		</p>
	</header>

	<div class="flex flex-col gap-3 border-y border-rule py-4 sm:flex-row sm:items-center sm:gap-4">
		<input
			type="search"
			bind:value={query}
			placeholder="Filter by name…"
			class="flex-1 border border-rule bg-dark px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-muted"
		/>
		<div class="flex flex-wrap items-center gap-1 text-xs">
			<button
				onclick={() => (typeFilter = '')}
				class="rounded px-2 py-0.5 transition-colors {typeFilter === '' ? 'bg-rule/50 text-bright' : 'text-muted hover:text-light'}"
			>
				all
			</button>
			{#each allTypes as [t, n] (t)}
				<button
					onclick={() => (typeFilter = t)}
					class="rounded px-2 py-0.5 capitalize transition-colors {typeFilter === t ? 'bg-rule/50 text-bright' : 'text-muted hover:text-light'}"
				>
					{t} <span class="text-muted/60">{n}</span>
				</button>
			{/each}
		</div>
	</div>

	<section class="py-8 pb-24">
		{#if filtered.length === 0}
			<p class="text-xs text-muted">No matches.</p>
		{:else}
			<p class="mb-6 text-xs text-muted">{filtered.length} {filtered.length === 1 ? 'person' : 'people'}</p>
			{#each grouped as [letter, group] (letter)}
				<div class="mb-8">
					<p class="mb-2 font-mono text-xs uppercase text-muted">{letter}</p>
					<div class="grid gap-x-6 gap-y-1 sm:grid-cols-2">
						{#each group as p (p.slug)}
							<a
								href="/people/{p.slug}"
								class="group flex items-baseline justify-between gap-2 border-b border-rule/40 py-2 no-underline hover:border-rule"
							>
								<div class="min-w-0">
									<span class="font-serif text-sm text-light transition-colors group-hover:text-bright">
										{p.name}
									</span>
									<span class="ml-2 text-xs text-muted">·{p.type}</span>
								</div>
								<span class="shrink-0 font-mono text-xs text-muted tabular-nums">{p.mentionCount}</span>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</section>
</div>
