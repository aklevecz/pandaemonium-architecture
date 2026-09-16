<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { colorRgb, isHighlightColor, DEFAULT_HIGHLIGHT_COLOR } from '$lib/highlight-colors';
	import { relTime } from '$lib/utils/time';
	import { weeks } from '$lib/data/syllabus';
	import DisplayNamePrompt from '$lib/components/DisplayNamePrompt.svelte';

	let { data } = $props();

	// Drafts keyed by highlight id so typing in one thread doesn't leak into
	// another when the list re-renders after a post.
	let drafts = $state<Record<number, string>>({});
	let posting = $state<number | null>(null);
	let openReply = $state<number | null>(null);
	let namePromptFor = $state<number | null>(null);
	let renaming = $state(false);
	let errorText = $state<string | null>(null);

	function rgb(color: string) {
		return colorRgb(isHighlightColor(color) ? color : DEFAULT_HIGHLIGHT_COLOR);
	}

	function readingHref(slug: string, text: string) {
		const anchor = text.slice(0, 80).split(/\s+/).slice(0, 12).join(' ');
		return `/reading/${slug}?q=${encodeURIComponent(anchor)}`;
	}

	function weekTitle(n: number) {
		return weeks.find((w) => w.number === n)?.title ?? '';
	}

	async function post(highlightId: number) {
		const body = (drafts[highlightId] ?? '').trim();
		if (!body || posting !== null) return;
		// First comment ever: ask what name to sign it with.
		if (!data.viewer.hasName) {
			namePromptFor = highlightId;
			return;
		}
		posting = highlightId;
		errorText = null;
		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ highlightId, body })
			});
			if (!res.ok) {
				errorText = `Could not post (${res.status})`;
				return;
			}
			drafts[highlightId] = '';
			openReply = null;
			await invalidateAll();
		} catch {
			errorText = 'Could not post (network)';
		} finally {
			posting = null;
		}
	}

	async function removeComment(id: number) {
		const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
	}

	async function unshare(highlightId: number) {
		const res = await fetch('/api/highlights', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: highlightId, shared: false })
		});
		if (res.ok) await invalidateAll();
	}

	// Entries grouped by week so the feed reads as the course does. Readings
	// with no week (introductory texts) sit under their own heading last.
	const groups = $derived.by(() => {
		const map = new Map<number | null, typeof data.entries>();
		for (const e of data.entries) {
			const key = e.reading.weekNumber;
			const list = map.get(key) ?? [];
			list.push(e);
			map.set(key, list);
		}
		return [...map.entries()].sort((a, b) => {
			if (a[0] === null) return 1;
			if (b[0] === null) return -1;
			return b[0] - a[0];
		});
	});
</script>

<svelte:head>
	<title>Commons · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pt-12 pb-8">
		<a href="/" class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; Back</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Commons</h1>
		<p class="mt-2 max-w-xl font-serif text-sm leading-relaxed text-gray">
			Passages classmates chose to share, and the conversation under each one. Share a highlight of
			your own from the reader: tap it and choose <span class="text-light">Share</span>. You appear
			here as <span class="text-light">{data.viewer.name}</span>
			<button
				type="button"
				onclick={() => (renaming = true)}
				class="ml-1 text-xs text-muted underline decoration-rule underline-offset-2 transition-colors hover:text-light"
				>change</button
			>.
		</p>
	</header>

	{#if data.weeksWithShares.length > 0}
		<nav
			class="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-y border-rule py-4"
			aria-label="Filter by week"
		>
			<a
				href="/commons"
				class="text-xs tracking-widest uppercase no-underline transition-colors {data.week
					? 'text-muted hover:text-light'
					: 'text-bright'}">All</a
			>
			{#each data.weeksWithShares as n (n)}
				<a
					href="/commons?week={n}"
					title={weekTitle(n)}
					class="font-mono text-xs tabular-nums no-underline transition-colors {data.week
						?.number === n
						? 'text-bright'
						: 'text-muted hover:text-light'}">{String(n).padStart(2, '0')}</a
				>
			{/each}
		</nav>
	{/if}

	{#if data.week}
		<p class="pt-6 text-xs text-muted">
			<span class="font-mono tabular-nums">{String(data.week.number).padStart(2, '0')}</span>
			&ensp;/&ensp;
			<a href="/week/{data.week.number}" class="text-light no-underline hover:text-bright"
				>{data.week.title}</a
			>
		</p>
	{/if}

	{#if errorText}
		<p class="pt-4 text-xs text-red-300">{errorText}</p>
	{/if}

	{#if data.entries.length === 0}
		<p class="py-16 text-center font-serif text-sm text-muted italic">
			{data.week ? 'Nothing shared for this week yet.' : 'Nothing shared yet. Be the first.'}
		</p>
	{:else}
		{#each groups as [weekNumber, entries] (weekNumber ?? 'intro')}
			<section class="py-10">
				{#if !data.week}
					<p class="text-xs tracking-widest text-muted uppercase">
						{#if weekNumber === null}
							Introductory readings
						{:else}
							<span class="font-mono tabular-nums">{String(weekNumber).padStart(2, '0')}</span>
							&ensp;/&ensp;
							<a href="/week/{weekNumber}" class="no-underline hover:text-light"
								>{weekTitle(weekNumber)}</a
							>
						{/if}
						<span class="ml-2 text-muted/60">{entries.length}</span>
					</p>
				{/if}

				<div class="mt-4 space-y-10">
					{#each entries as e (e.id)}
						<article class="border-l-2 pl-4" style="border-color: rgb({rgb(e.color)} / 0.6);">
							<p class="text-xs text-muted">
								<span class="text-light">{e.author}</span>
								<span class="text-muted/60">&middot;</span>
								{relTime(e.shared_at)}
								<span class="text-muted/60">&middot;</span>
								<a href="/reading/{e.slug}" class="no-underline hover:text-light"
									>{e.reading.author ? `${e.reading.author}, ` : ''}<span class="italic"
										>{e.reading.title}</span
									></a
								>
							</p>
							<a
								href={readingHref(e.slug, e.text)}
								class="mt-2 block font-serif text-base leading-relaxed text-light italic no-underline transition-colors hover:text-bright"
								title="Open this passage in the reading"
							>
								&ldquo;{e.text}&rdquo;
							</a>
							{#if e.note}
								<p class="mt-2 font-serif text-sm leading-relaxed text-gray">{e.note}</p>
							{/if}

							{#if e.comments.length > 0}
								<ul class="mt-4 space-y-3 border-t border-rule pt-4">
									{#each e.comments as c (c.id)}
										<li>
											<p class="text-xs text-muted">
												<span class="text-light">{c.author}</span>
												<span class="text-muted/60">&middot;</span>
												{relTime(c.created_at)}
												{#if c.userId === data.viewer.id || data.viewer.isInstructor}
													<span class="text-muted/60">&middot;</span>
													<button
														type="button"
														onclick={() => removeComment(c.id)}
														class="text-muted transition-colors hover:text-red-300">Remove</button
													>
												{/if}
											</p>
											<p
												class="mt-1 font-serif text-sm leading-relaxed whitespace-pre-line text-gray"
											>
												{c.body}
											</p>
										</li>
									{/each}
								</ul>
							{/if}

							<div class="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
								{#if openReply === e.id}
									<form
										class="w-full"
										onsubmit={(ev) => {
											ev.preventDefault();
											post(e.id);
										}}
									>
										<textarea
											bind:value={drafts[e.id]}
											rows="3"
											placeholder="Reply to {e.author}…"
											class="w-full resize-none border border-rule bg-dark px-3 py-2 font-serif text-sm text-white outline-none placeholder:text-muted focus:border-muted"
										></textarea>
										<div class="mt-2 flex items-baseline gap-4">
											<button
												type="submit"
												disabled={posting !== null || !(drafts[e.id] ?? '').trim()}
												class="rounded-full border border-muted px-4 py-1.5 text-xs text-bright transition-colors hover:bg-rule/50 disabled:cursor-not-allowed disabled:opacity-40"
												>{posting === e.id ? 'Posting…' : 'Post'}</button
											>
											<button
												type="button"
												onclick={() => (openReply = null)}
												class="text-xs text-muted transition-colors hover:text-light">Cancel</button
											>
										</div>
									</form>
								{:else}
									<button
										type="button"
										onclick={() => (openReply = e.id)}
										class="text-xs text-muted transition-colors hover:text-light"
										>{e.comments.length === 0 ? 'Reply' : `Reply (${e.comments.length})`}</button
									>
									{#if e.userId === data.viewer.id}
										<button
											type="button"
											onclick={() => unshare(e.id)}
											class="text-xs text-muted transition-colors hover:text-light"
											title="Take this highlight back to your private notebook">Unshare</button
										>
									{/if}
								{/if}
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
	<div class="pb-20"></div>
</div>

{#if renaming}
	<DisplayNamePrompt
		suggested={data.viewer.name}
		what="change how you appear"
		onDone={async () => {
			renaming = false;
			await invalidateAll();
		}}
		onCancel={() => (renaming = false)}
	/>
{:else if namePromptFor !== null}
	<DisplayNamePrompt
		suggested={data.viewer.name}
		what="sign your reply"
		onDone={async () => {
			const id = namePromptFor;
			namePromptFor = null;
			await invalidateAll();
			if (id !== null) await post(id);
		}}
		onCancel={() => (namePromptFor = null)}
	/>
{/if}
