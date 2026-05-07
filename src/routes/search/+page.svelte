<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { buildReadingMetaList, type ReadingMeta } from '$lib/search';

	interface Chunk {
		chunkIndex: number;
		text: string;
		position: number;
		score: number;
	}
	interface Group {
		slug: string;
		score: number;
		chunks: Chunk[];
	}

	const metaBySlug = new Map<string, ReadingMeta>();
	for (const m of buildReadingMetaList()) metaBySlug.set(m.slug, m);
	let fallbackMeta = $state<Record<string, { author: string; title: string }>>({});
	if (browser) {
		fetch('/readings-fallback.json')
			.then((r) => (r.ok ? r.json() : {}))
			.then((j) => (fallbackMeta = j))
			.catch(() => {});
	}
	function metaFor(slug: string): { author: string; title: string } {
		const fromSyllabus = metaBySlug.get(slug);
		if (fromSyllabus) return { author: fromSyllabus.author, title: fromSyllabus.title };
		const fb = fallbackMeta[slug];
		if (fb) return fb;
		return { author: '', title: slug };
	}

	let query = $state(browser ? page.url.searchParams.get('q') ?? '' : '');
	let loading = $state(false);
	let groups: Group[] = $state([]);
	let error: string | null = $state(null);
	let debounce: ReturnType<typeof setTimeout> | null = null;
	let inputEl: HTMLInputElement | undefined = $state();
	let inflightController: AbortController | null = null;

	$effect(() => {
		if (inputEl) inputEl.focus();
	});

	$effect(() => {
		// Run initial search if URL arrived with ?q=
		if (browser && query.trim().length >= 2 && groups.length === 0 && !loading) {
			runSearch(query);
		}
	});

	$effect(() => {
		const q = query;
		if (debounce) clearTimeout(debounce);
		if (!browser) return;
		if (q.trim().length < 2) {
			groups = [];
			error = null;
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
		}, 300);
	});

	async function runSearch(q: string) {
		inflightController?.abort();
		const controller = new AbortController();
		inflightController = controller;
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8&perReading=3`, {
				signal: controller.signal
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = (await res.json()) as { groups: Group[] };
			groups = json.groups;
		} catch (err) {
			if (err instanceof Error && err.name !== 'AbortError') {
				error = err.message;
				groups = [];
			}
		} finally {
			if (inflightController === controller) {
				inflightController = null;
				loading = false;
			}
		}
	}

	function readingHref(slug: string, chunk: Chunk): string {
		// Anchor on the first ~80 chars of the chunk so the reader's ?q=
		// highlighter scrolls to it. Substring search is case-insensitive and
		// handles whitespace variation well enough.
		const anchor = chunk.text.slice(0, 80).split(/\s+/).slice(0, 12).join(' ');
		return `/reading/${slug}?q=${encodeURIComponent(anchor)}`;
	}

	const totalChunks = $derived(groups.reduce((n, g) => n + g.chunks.length, 0));
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
		<p class="mt-2 text-xs text-muted">semantic search across {metaBySlug.size} readings</p>
	</header>

	<form onsubmit={(e) => e.preventDefault()} class="mb-8">
		<input
			bind:this={inputEl}
			type="search"
			bind:value={query}
			placeholder="What do the readings say about…"
			autocomplete="off"
			class="w-full border border-rule bg-dark px-4 py-3 font-serif text-base text-white outline-none placeholder:text-muted focus:border-muted"
		/>
	</form>

	{#if loading && groups.length === 0}
		<p class="text-xs text-muted">Searching…</p>
	{:else if error}
		<p class="text-xs text-muted">Search error: {error}</p>
	{:else if query.trim().length >= 2 && groups.length === 0 && !loading}
		<p class="text-xs text-muted">No matches.</p>
	{:else if groups.length > 0}
		<p class="text-xs text-muted">
			{totalChunks} {totalChunks === 1 ? 'passage' : 'passages'} across {groups.length}
			{groups.length === 1 ? 'reading' : 'readings'}
		</p>
		<div class="mt-6 space-y-10 pb-24">
			{#each groups as group (group.slug)}
				{@const meta = metaFor(group.slug)}
				<article>
					<a href={readingHref(group.slug, group.chunks[0])} class="group block no-underline">
						<div class="flex items-baseline justify-between gap-3">
							<div class="min-w-0">
								{#if meta.author}
									<p class="text-xs text-muted">{meta.author}</p>
								{/if}
								<h2 class="mt-0.5 font-serif text-lg text-light transition-colors group-hover:text-bright">
									{meta.title}
								</h2>
							</div>
							<span class="shrink-0 font-mono text-xs text-muted tabular-nums">
								{(group.score * 100).toFixed(0)}%
							</span>
						</div>
					</a>
					<div class="mt-3 space-y-3 border-l border-rule pl-4">
						{#each group.chunks as chunk (chunk.chunkIndex)}
							<a
								href={readingHref(group.slug, chunk)}
								class="block no-underline transition-colors hover:bg-rule/10"
							>
								<p class="font-serif text-sm leading-relaxed text-gray">
									{chunk.text.slice(0, 280)}{chunk.text.length > 280 ? '…' : ''}
								</p>
								<p class="mt-1 font-mono text-[10px] text-muted/70 tabular-nums">
									{(chunk.score * 100).toFixed(0)}%
								</p>
							</a>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
