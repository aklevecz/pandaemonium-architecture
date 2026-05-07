<script lang="ts">
	import { browser } from '$app/environment';
	import { buildReadingMetaList, type ReadingMeta } from '$lib/search';

	interface ReadingSummary {
		slug: string;
		explainStudents: number;
		explainEvents: number;
		highlightStudents: number;
		highlightEvents: number;
	}
	interface PassageRow {
		text: string;
		students: number;
		picks: number;
		first_at: string;
		last_at: string;
		avg_position: number | null;
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
		return fallbackMeta[slug] ?? { author: '', title: slug };
	}

	let totals: { uniqueStudents: number; explainEvents: number; highlightEvents: number } = $state(
		{ uniqueStudents: 0, explainEvents: 0, highlightEvents: 0 }
	);
	let readings: ReadingSummary[] = $state([]);
	let summaryLoading = $state(true);
	let summaryError: string | null = $state(null);

	let selectedSlug: string | null = $state(null);
	let detail: { explains: PassageRow[]; highlights: PassageRow[] } | null = $state(null);
	let detailLoading = $state(false);

	if (browser) loadSummary();

	async function loadSummary() {
		summaryLoading = true;
		summaryError = null;
		try {
			const res = await fetch('/api/activity/insights');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			totals = json.totals;
			readings = json.readings;
		} catch (err) {
			summaryError = err instanceof Error ? err.message : 'failed';
		} finally {
			summaryLoading = false;
		}
	}

	async function openSlug(slug: string) {
		selectedSlug = slug;
		detail = null;
		detailLoading = true;
		try {
			const res = await fetch(`/api/activity/insights?slug=${encodeURIComponent(slug)}`);
			if (res.ok) detail = await res.json();
		} finally {
			detailLoading = false;
		}
	}

	function readingHref(slug: string, text: string) {
		const anchor = text.slice(0, 80).split(/\s+/).slice(0, 12).join(' ');
		return `/reading/${slug}?q=${encodeURIComponent(anchor)}`;
	}
</script>

<svelte:head>
	<title>Class activity · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 sm:px-6">
	<header class="pb-8 pt-12">
		<a href="/" class="text-xs text-muted transition-colors hover:text-white uppercase">&larr; Back</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Class activity</h1>
		<p class="mt-2 text-xs text-muted">
			What the class is chewing on — passages picked for explanation, passages
			highlighted. Counts only; no per-student names.
		</p>
	</header>

	{#if summaryLoading}
		<p class="text-xs text-muted">Loading…</p>
	{:else if summaryError}
		<p class="text-xs text-muted">Error: {summaryError}</p>
	{:else}
		<section class="grid grid-cols-3 gap-4 border-y border-rule py-6">
			<div>
				<p class="text-xs uppercase text-muted">Active students</p>
				<p class="mt-1 font-mono text-2xl text-bright tabular-nums">{totals.uniqueStudents}</p>
			</div>
			<div>
				<p class="text-xs uppercase text-muted">Explain picks</p>
				<p class="mt-1 font-mono text-2xl text-bright tabular-nums">{totals.explainEvents}</p>
			</div>
			<div>
				<p class="text-xs uppercase text-muted">Highlights</p>
				<p class="mt-1 font-mono text-2xl text-bright tabular-nums">{totals.highlightEvents}</p>
			</div>
		</section>

		<section class="py-8">
			<p class="mb-4 text-xs uppercase tracking-widest text-muted">Readings by engagement</p>
			{#if readings.length === 0}
				<p class="text-xs text-muted">No activity yet.</p>
			{:else}
				<div class="divide-y divide-rule">
					{#each readings as r (r.slug)}
						{@const meta = metaFor(r.slug)}
						<button
							type="button"
							onclick={() => openSlug(r.slug)}
							class="block w-full py-3 text-left transition-colors hover:bg-rule/20 {selectedSlug === r.slug ? 'bg-rule/30' : ''}"
						>
							<div class="flex items-baseline gap-4 px-2">
								<div class="min-w-0 flex-1">
									{#if meta.author}<p class="text-xs text-muted">{meta.author}</p>{/if}
									<p class="font-serif text-sm text-light">{meta.title}</p>
								</div>
								<div class="flex shrink-0 gap-6 font-mono text-xs text-muted tabular-nums">
									<span title="explain picks ({r.explainStudents} students)">
										{r.explainEvents}<span class="text-muted/60">·{r.explainStudents}</span> ?
									</span>
									<span title="highlights ({r.highlightStudents} students)">
										{r.highlightEvents}<span class="text-muted/60">·{r.highlightStudents}</span> ✦
									</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</section>

		{#if selectedSlug}
			{@const meta = metaFor(selectedSlug)}
			<section class="border-t border-rule py-8">
				<p class="text-xs uppercase tracking-widest text-muted">Passage detail</p>
				<h2 class="mt-1 font-serif text-2xl text-bright">{meta.title}</h2>
				{#if meta.author}<p class="text-xs text-muted">{meta.author}</p>{/if}

				{#if detailLoading}
					<p class="mt-6 text-xs text-muted">Loading passages…</p>
				{:else if detail}
					{#if detail.explains.length > 0}
						<div class="mt-6">
							<p class="mb-3 text-xs uppercase text-muted">Most picked for explanation</p>
							<ul class="space-y-3">
								{#each detail.explains as p}
									<li class="border-l-2 border-yellow-500/40 pl-3">
										<a href={readingHref(selectedSlug, p.text)} class="font-serif text-sm text-light no-underline hover:text-bright">
											{p.text.length > 240 ? p.text.slice(0, 240) + '…' : p.text}
										</a>
										<p class="mt-1 font-mono text-xs text-muted tabular-nums">
											{p.students} {p.students === 1 ? 'student' : 'students'} · {p.picks} {p.picks === 1 ? 'pick' : 'picks'}
											{#if p.avg_position !== null}
												· position {(p.avg_position * 100).toFixed(0)}%
											{/if}
										</p>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if detail.highlights.length > 0}
						<div class="mt-8">
							<p class="mb-3 text-xs uppercase text-muted">Most highlighted</p>
							<ul class="space-y-3">
								{#each detail.highlights as p}
									<li class="border-l-2 border-yellow-500/30 pl-3">
										<a href={readingHref(selectedSlug, p.text)} class="font-serif text-sm text-light no-underline hover:text-bright">
											{p.text.length > 240 ? p.text.slice(0, 240) + '…' : p.text}
										</a>
										<p class="mt-1 font-mono text-xs text-muted tabular-nums">
											{p.students} {p.students === 1 ? 'student' : 'students'} · {p.picks} {p.picks === 1 ? 'pick' : 'picks'}
										</p>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if detail.explains.length === 0 && detail.highlights.length === 0}
						<p class="mt-6 text-xs text-muted">No passages yet for this reading.</p>
					{/if}
				{/if}
			</section>
		{/if}
	{/if}
</div>
