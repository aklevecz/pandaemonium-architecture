<script lang="ts">
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import { colorRgb } from '$lib/highlight-colors';
	import {
		entryLabels,
		entryHref,
		exportNotebook,
		filterEntries,
		type EntryKind
	} from '$lib/notebook';

	let { data } = $props();
	let visibleCount = $state(24);
	let exportStatus = $state('');
	const filters = $derived(
		page.state.notebookFilters ?? {
			query: page.url.searchParams.get('q') ?? '',
			kind: page.url.searchParams.get('kind') ?? '',
			reading: page.url.searchParams.get('reading') ?? '',
			sort: page.url.searchParams.get('sort') ?? 'newest'
		}
	);
	const matching = $derived(filterEntries(data.entries, data.readings, filters));
	const available = $derived(filterEntries(data.entries, data.readings, { ...filters, kind: '' }));
	const readingOptions = $derived(
		[...new Set(data.entries.map((e) => e.slug))].sort((a, b) =>
			data.readings[a].title.localeCompare(data.readings[b].title)
		)
	);
	const kinds: EntryKind[] = ['note', 'highlight', 'vocab', 'conversation'];
	const pluralLabels = {
		note: 'Notes',
		highlight: 'Highlights',
		vocab: 'Vocabulary',
		conversation: 'Conversations'
	};
	const dateFormat = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
	function dateLabel(value: string) {
		const date = new Date(value.replace(' ', 'T') + 'Z');
		return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
	}
	function setFilter(key: string, value: string) {
		const next = { ...filters, [key === 'q' ? 'query' : key]: value };
		const url = new URL('/notebook', page.url.origin);
		for (const [name, filter] of Object.entries(next)) {
			if (filter) url.searchParams.set(name === 'query' ? 'q' : name, filter);
		}
		replaceState(url, { ...page.state, notebookFilters: next });
		visibleCount = 24;
		exportStatus = '';
	}
	function clearFilters() {
		replaceState('/notebook', {
			...page.state,
			notebookFilters: { query: '', kind: '', reading: '', sort: 'newest' }
		});
		visibleCount = 24;
	}
	function download() {
		const markdown = exportNotebook(matching, data.readings, page.url.origin);
		const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `pandaemonium-notebook-${new Date().toISOString().slice(0, 10)}.md`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		exportStatus = `Exported ${matching.length} ${matching.length === 1 ? 'entry' : 'entries'}.`;
	}
</script>

<svelte:head><title>My notebook · Pandaemonium Architecture</title></svelte:head>

<div class="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
	<header class="pt-10 pb-8 sm:pt-14">
		<p class="text-xs tracking-widest text-muted uppercase">Across the course</p>
		<div class="mt-3 flex flex-wrap items-end justify-between gap-5">
			<h1 class="font-serif text-4xl font-normal text-bright sm:text-5xl">My notebook</h1>
			<button
				onclick={download}
				disabled={!matching.length}
				class="rounded border border-rule px-4 py-2 text-sm text-light transition-colors hover:border-muted disabled:opacity-40"
			>
				Export {filters.query || filters.kind || filters.reading ? 'results' : 'notebook'} ↓
			</button>
		</div>
		<p class="mt-4 max-w-xl font-serif text-lg leading-relaxed text-gray">
			Your notes, passages, words, and conversations. Return to an idea and follow it across
			readings.
		</p>
		<p class="mt-3 text-xs text-muted">
			Only your saved work appears here. Exports include source links and full conversations.
		</p>
		<p class="mt-2 text-xs text-muted" role="status">{exportStatus}</p>
	</header>

	{#if data.entries.length === 0}
		<section class="border-y border-rule py-12">
			<h2 class="font-serif text-2xl text-light">A place for what stays with you.</h2>
			<p class="mt-3 max-w-lg font-serif leading-relaxed text-gray">
				Highlight a passage, write a note, define a word, or start a conversation in any reading. It
				will appear here automatically.
			</p>
			<a href="/readings" class="mt-6 inline-block text-sm text-light underline underline-offset-4"
				>Find a reading →</a
			>
		</section>
	{:else}
		<section aria-label="Filter notebook" class="border-y border-rule py-5">
			<label for="notebook-search" class="text-xs text-muted">Search your notebook</label>
			<input
				id="notebook-search"
				type="search"
				value={filters.query}
				oninput={(e) => setFilter('q', e.currentTarget.value)}
				placeholder="An idea, a passage, an author…"
				class="mt-2 w-full rounded border border-rule bg-dark px-4 py-3 font-serif text-lg text-white placeholder:text-muted focus:outline-2 focus:outline-muted"
			/>
			<div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Entry type">
				<button
					onclick={() => setFilter('kind', '')}
					aria-pressed={!filters.kind}
					class="filter-button"
					class:chosen={!filters.kind}>All <span>{available.length}</span></button
				>
				{#each kinds as kind}
					<button
						onclick={() => setFilter('kind', kind)}
						aria-pressed={filters.kind === kind}
						class="filter-button"
						class:chosen={filters.kind === kind}
					>
						{pluralLabels[kind]} <span>{available.filter((e) => e.kind === kind).length}</span>
					</button>
				{/each}
			</div>
			<div class="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
				<label class="min-w-0 text-xs text-muted"
					>Reading
					<select
						value={filters.reading}
						onchange={(e) => setFilter('reading', e.currentTarget.value)}
						class="mt-2 block w-full min-w-0 rounded border border-rule bg-black px-3 py-2.5 text-sm text-light"
					>
						<option value="">All readings ({readingOptions.length})</option>
						{#each readingOptions as slug}<option value={slug}
								>{data.readings[slug].author} — {data.readings[slug].title}</option
							>{/each}
					</select>
				</label>
				<label class="text-xs text-muted"
					>Sort
					<select
						value={filters.sort}
						onchange={(e) => setFilter('sort', e.currentTarget.value)}
						class="mt-2 block w-full rounded border border-rule bg-black px-3 py-2.5 text-sm text-light"
					>
						<option value="newest">Newest first</option><option value="oldest">Oldest first</option
						><option value="reading">By reading</option>
					</select>
				</label>
			</div>
		</section>
		<div class="flex items-baseline justify-between gap-4 py-5 text-xs text-muted">
			<p role="status">
				{matching.length}
				{matching.length === 1 ? 'entry' : 'entries'}{filters.query
					? ` matching “${filters.query}”`
					: ''}
			</p>
			{#if filters.query || filters.kind || filters.reading}<button
					onclick={clearFilters}
					class="shrink-0 text-light underline underline-offset-4">Clear filters</button
				>{/if}
		</div>
		{#if matching.length === 0}
			<p class="py-12 font-serif text-xl text-gray">
				No entries match. Try another phrase or clear the filters.
			</p>
		{:else}
			<div class="space-y-5">
				{#each matching.slice(0, visibleCount) as entry (`${entry.kind}-${entry.id}`)}
					{@const reading = data.readings[entry.slug]}
					<article class="min-w-0 rounded border border-rule p-5 sm:p-6">
						<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
							<span class="tracking-widest uppercase">{entryLabels[entry.kind]}</span>
							<time datetime={entry.updated_at.replace(' ', 'T') + 'Z'}
								>{dateLabel(entry.updated_at)}</time
							>
						</div>
						{#if entry.kind === 'conversation'}
							<h2 class="mt-4 font-serif text-xl text-light">{entry.text}</h2>
							<details class="mt-3">
								<summary class="cursor-pointer text-sm text-muted"
									>Read conversation · {entry.messages?.length ?? 0} messages</summary
								>
								<div class="mt-5 overflow-x-auto">
									{#each entry.messages ?? [] as message}<ChatMessage
											role={message.role}
											content={message.content}
										/>{/each}
									{#if !entry.messages?.length}<p class="text-sm text-muted">
											No messages saved in this conversation yet.
										</p>{/if}
								</div>
							</details>
						{:else if entry.kind === 'highlight'}
							<blockquote
								class="mt-4 border-l-2 pl-4 font-serif text-lg leading-relaxed whitespace-pre-wrap text-light"
								style:border-color={`rgb(${colorRgb(entry.color)} / 0.7)`}
							>
								{entry.text}
							</blockquote>
							{#if entry.detail}<p
									class="mt-4 font-serif leading-relaxed whitespace-pre-wrap text-gray"
								>
									{entry.detail}
								</p>{/if}
						{:else if entry.kind === 'vocab'}
							<h2 class="mt-4 font-serif text-2xl text-light">{entry.text}</h2>
							<p class="mt-2 font-serif leading-relaxed whitespace-pre-wrap text-gray">
								{entry.detail}
							</p>
							{#if entry.context}<blockquote
									class="mt-4 border-l border-rule pl-4 font-serif text-sm leading-relaxed text-muted"
								>
									{entry.context}
								</blockquote>{/if}
						{:else}
							<p class="mt-4 font-serif text-lg leading-relaxed whitespace-pre-wrap text-light">
								{entry.text}
							</p>
						{/if}
						<footer class="mt-5 border-t border-rule pt-4">
							<p class="text-xs text-muted">
								{reading.author}{reading.weekNumber
									? ` · Week ${String(reading.weekNumber).padStart(2, '0')}`
									: ''}
							</p>
							<a
								href={entryHref(entry)}
								class="mt-1 block font-serif text-sm text-gray underline decoration-rule underline-offset-4 hover:text-bright"
								>{reading.title} →</a
							>
						</footer>
					</article>
				{/each}
			</div>
			{#if matching.length > visibleCount}<button
					onclick={() => (visibleCount += 24)}
					class="mt-6 w-full rounded border border-rule py-3 text-sm text-light hover:border-muted"
					>Show more · {matching.length - visibleCount} remaining</button
				>{/if}
		{/if}
	{/if}
</div>

<style>
	.filter-button {
		border: 1px solid var(--color-rule);
		border-radius: 4px;
		padding: 0.55rem 0.8rem;
		font-size: 0.8rem;
		color: var(--color-muted);
	}
	.filter-button span {
		margin-left: 0.4rem;
		font-variant-numeric: tabular-nums;
	}
	.filter-button:hover,
	.filter-button.chosen {
		border-color: var(--color-muted);
		color: var(--color-bright);
		background: var(--color-dark);
	}
	article {
		overflow-wrap: anywhere;
	}
</style>
