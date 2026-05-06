<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import {
		buildReadingMetaList,
		loadCorpus,
		search,
		type SearchHit,
		type ReadingMeta
	} from '$lib/search';

	const metaList: ReadingMeta[] = buildReadingMetaList();

	let query = $state(browser ? page.url.searchParams.get('q') ?? '' : '');
	let corpus: Record<string, string> | null = $state(null);
	let loading = $state(false);
	let hits: SearchHit[] = $state([]);
	let debounce: ReturnType<typeof setTimeout> | null = null;
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		// JS-driven focus instead of the autofocus attribute (a11y).
		if (inputEl) inputEl.focus();
	});

	async function ensureCorpus() {
		if (corpus) return corpus;
		loading = true;
		try {
			corpus = await loadCorpus(metaList);
			return corpus;
		} finally {
			loading = false;
		}
	}

	async function runSearch(q: string) {
		const c = await ensureCorpus();
		hits = search(q, c, metaList);
	}

	// Debounce keystrokes; also sync the URL so results are linkable.
	$effect(() => {
		const q = query;
		if (debounce) clearTimeout(debounce);
		if (!browser) return;
		if (q.trim().length < 2) {
			hits = [];
			if (page.url.searchParams.get('q')) {
				goto('/search', { replaceState: true, keepFocus: true });
			}
			return;
		}
		debounce = setTimeout(() => {
			runSearch(q);
			const url = new URL(page.url);
			url.searchParams.set('q', q);
			goto(url, { replaceState: true, keepFocus: true });
		}, 250);
	});

	function readingHref(slug: string, q: string) {
		return `/reading/${slug}?q=${encodeURIComponent(q)}`;
	}
</script>

<svelte:head>
	<title>Search · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pb-8 pt-12">
		<a href="/" class="text-xs text-muted transition-colors hover:text-white uppercase">
			&larr; Back
		</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Search</h1>
		<p class="mt-2 text-xs text-muted">across {metaList.length} readings</p>
	</header>

	<form onsubmit={(e) => e.preventDefault()} class="mb-8">
		<input
			bind:this={inputEl}
			type="search"
			bind:value={query}
			placeholder="Search readings…"
			autocomplete="off"
			class="w-full border border-rule bg-dark px-4 py-3 font-serif text-base text-white outline-none placeholder:text-muted focus:border-muted"
		/>
	</form>

	{#if loading && hits.length === 0}
		<p class="text-xs text-muted">Loading reading content…</p>
	{:else if query.trim().length >= 2 && hits.length === 0 && !loading}
		<p class="text-xs text-muted">No matches.</p>
	{:else if hits.length > 0}
		<p class="text-xs text-muted">
			{hits.reduce((n, h) => n + h.matches, 0)} matches across {hits.length} readings
		</p>
		<div class="mt-6 space-y-8 pb-24">
			{#each hits as hit (hit.meta.slug)}
				<article>
					<a href={readingHref(hit.meta.slug, query)} class="group block no-underline">
						<p class="text-xs text-muted">{hit.meta.author}</p>
						<h2 class="mt-1 font-serif text-lg text-light transition-colors group-hover:text-bright">
							{hit.meta.title}
						</h2>
						<p class="mt-1 text-xs text-muted">
							{#if hit.meta.weekNumber}
								Week {String(hit.meta.weekNumber).padStart(2, '0')}{hit.meta.isAdditional
									? ' · Additional'
									: ''}
							{:else if hit.meta.isIntroductory}
								Introductory
							{/if}
							{#if hit.matches > 0}
								· {hit.matches} {hit.matches === 1 ? 'match' : 'matches'}
							{:else}
								· title/author match
							{/if}
						</p>
					</a>
					{#if hit.snippets.length > 0}
						<div class="mt-3 space-y-3 border-l border-rule pl-4">
							{#each hit.snippets as snip}
								<a
									href={readingHref(hit.meta.slug, query)}
									class="block font-serif text-sm text-gray no-underline transition-colors hover:text-light"
								>
									{snip.before}<mark class="bg-bright/20 text-bright">{snip.match}</mark
									>{snip.after}
								</a>
							{/each}
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>
