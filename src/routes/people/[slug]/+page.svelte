<script lang="ts">
	let { data } = $props();
	const { person, neighbors, readingMentions } = data;

	function readingHref(slug: string, snippet: string) {
		const anchor = snippet.slice(0, 80).split(/\s+/).slice(0, 12).join(' ');
		return `/reading/${slug}?q=${encodeURIComponent(anchor)}`;
	}

	const lifespan = $derived.by(() => {
		const wp = person.wikipedia;
		if (!wp) return null;
		if (wp.birthYear && wp.deathYear) return `${wp.birthYear}–${wp.deathYear}`;
		if (wp.birthYear) return `b. ${wp.birthYear}`;
		if (wp.deathYear) return `d. ${wp.deathYear}`;
		return null;
	});
</script>

<svelte:head>
	<title>{person.name} · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pb-8 pt-12">
		<a href="/people" class="text-xs text-muted transition-colors hover:text-white uppercase">
			&larr; People
		</a>
		<div class="mt-8 flex items-start gap-5">
			{#if person.wikipedia?.thumbnail}
				<img
					src={person.wikipedia.thumbnail}
					alt={person.name}
					class="hidden h-24 w-24 shrink-0 rounded border border-rule object-cover sm:block"
				/>
			{/if}
			<div class="min-w-0">
				<h1 class="font-serif text-3xl font-normal leading-tight text-bright sm:text-4xl">
					{person.name}
				</h1>
				<p class="mt-2 text-xs text-muted">
					<span class="capitalize">{person.type}</span>
					{#if lifespan}
						· {lifespan}
					{/if}
					· {person.mentionCount} {person.mentionCount === 1 ? 'mention' : 'mentions'} across {person.readings.length}
					{person.readings.length === 1 ? 'reading' : 'readings'}
				</p>
			</div>
		</div>
	</header>

	<div class="h-px bg-rule"></div>

	{#if person.corpusContext}
		<section class="py-8">
			<p class="text-xs uppercase tracking-widest text-muted">In this course</p>
			<p class="mt-3 font-serif text-base leading-relaxed text-light">
				{person.corpusContext}
			</p>
		</section>
		<div class="h-px bg-rule"></div>
	{/if}

	{#if person.wikipedia?.extract}
		<section class="py-8">
			<p class="text-xs uppercase tracking-widest text-muted">Background</p>
			<p class="mt-3 font-serif text-sm leading-relaxed text-gray">
				{person.wikipedia.extract}
			</p>
			{#if person.wikipedia.url}
				<a
					href={person.wikipedia.url}
					target="_blank"
					rel="noopener"
					class="mt-2 inline-block text-xs text-muted underline hover:text-light"
				>
					Wikipedia &rarr;
				</a>
			{/if}
		</section>
		<div class="h-px bg-rule"></div>
	{/if}

	<section class="py-8">
		<p class="text-xs uppercase tracking-widest text-muted">
			Mentioned in {readingMentions.length} {readingMentions.length === 1 ? 'reading' : 'readings'}
		</p>
		<div class="mt-4 space-y-6">
			{#each readingMentions as r (r.slug)}
				<article>
					<div class="flex items-baseline justify-between gap-3">
						<a
							href={readingHref(r.slug, r.mentions[0].snippet)}
							class="group flex-1 no-underline"
						>
							{#if r.meta.author}<p class="text-xs text-muted">{r.meta.author}</p>{/if}
							<h2 class="font-serif text-base text-light transition-colors group-hover:text-bright">
								{r.meta.title}
							</h2>
						</a>
						<span class="shrink-0 font-mono text-xs text-muted tabular-nums">
							{r.mentions.length}
						</span>
					</div>
					<div class="mt-2 space-y-2 border-l border-rule pl-4">
						{#each r.mentions.slice(0, 3) as m, i (i)}
							<a
								href={readingHref(r.slug, m.snippet)}
								class="block font-serif text-sm leading-relaxed text-gray no-underline transition-colors hover:text-light"
							>
								{m.snippet.slice(0, 240)}{m.snippet.length > 240 ? '…' : ''}
							</a>
						{/each}
						{#if r.mentions.length > 3}
							<p class="text-xs text-muted">+{r.mentions.length - 3} more</p>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</section>

	{#if neighbors.length > 0}
		<div class="h-px bg-rule"></div>
		<section class="py-8 pb-24">
			<p class="text-xs uppercase tracking-widest text-muted">
				Appears alongside
			</p>
			<p class="mt-1 text-xs text-muted">
				People mentioned in the same passages — sorted by co-occurrence weight.
			</p>
			<div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
				{#each neighbors as n (n.person.id)}
					<a
						href="/people/{n.person.id}"
						class="group flex items-baseline justify-between gap-2 border-b border-rule/40 py-1.5 no-underline hover:border-rule"
					>
						<span class="min-w-0 truncate font-serif text-sm text-light transition-colors group-hover:text-bright">
							{n.person.name}
						</span>
						<span class="shrink-0 font-mono text-xs text-muted tabular-nums">{n.weight}</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>
