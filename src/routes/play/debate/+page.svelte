<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { data } = $props();

	interface Thinker {
		slug: string;
		name: string;
		type: string;
		mentionCount: number;
		hasContext: boolean;
		hasWikipedia: boolean;
		birthYear: number | null;
		deathYear: number | null;
	}
	interface Turn {
		role: 'user' | 'assistant';
		content: string;
	}

	let thinkerA: Thinker | null = $state(null);
	let thinkerB: Thinker | null = $state(null);
	let topic = $state('');
	let history: Turn[] = $state([]);
	let streaming = $state(false);
	let abortCtrl: AbortController | null = null;

	// Turn budget — caps the debate so it doesn't run forever. Each
	// assistant turn = one "exchange" (which contains 2-3 tagged paragraphs
	// already). When count == budget, isLast signals the API to wind down.
	let maxExchanges = $state(6);
	const exchangeCount = $derived(
		history.filter((t) => t.role === 'assistant' && t.content.trim().length > 0).length
	);
	const debateComplete = $derived(exchangeCount >= maxExchanges && !streaming);

	let query = $state('');
	let typeFilter = $state<string>('');

	const allTypes = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const t of data.thinkers) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return data.thinkers
			.filter((t) => (typeFilter ? t.type === typeFilter : true))
			.filter((t) => (q ? t.name.toLowerCase().includes(q) : true))
			.slice(0, 120);
	});

	function pick(t: Thinker) {
		if (thinkerA?.slug === t.slug) {
			thinkerA = null;
			return;
		}
		if (thinkerB?.slug === t.slug) {
			thinkerB = null;
			return;
		}
		if (!thinkerA) thinkerA = t;
		else if (!thinkerB) thinkerB = t;
		else thinkerB = t; // replace B
	}

	function swap() {
		const a = thinkerA;
		thinkerA = thinkerB;
		thinkerB = a;
	}

	function reset() {
		abortCtrl?.abort();
		abortCtrl = null;
		streaming = false;
		history = [];
	}

	function abort() {
		abortCtrl?.abort();
	}

	async function startOrContinue(extraTurnContent: string | null = null) {
		if (!thinkerA || !thinkerB || streaming) return;
		streaming = true;
		const controller = new AbortController();
		abortCtrl = controller;

		// Append moderator turn if the student spoke. Append an empty
		// assistant turn we'll stream into so the UI renders as it grows.
		const localHistory: Turn[] = [...history];
		if (extraTurnContent) localHistory.push({ role: 'user', content: extraTurnContent });
		localHistory.push({ role: 'assistant', content: '' });
		history = localHistory;
		const assistantIdx = history.length - 1;

		// Count exchanges that will exist AFTER this turn completes. If this
		// turn equals the budget, ask Claude to wind the debate down.
		const willBeExchange = exchangeCount + 1;
		const isLast = willBeExchange >= maxExchanges;
		try {
			const res = await fetch('/api/play/debate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: controller.signal,
				body: JSON.stringify({
					thinkerASlug: thinkerA.slug,
					thinkerBSlug: thinkerB.slug,
					topic: topic.trim() || undefined,
					isLast,
					// Don't send the empty assistant slot to the API.
					history: history.slice(0, assistantIdx)
				})
			});
			if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let done = false;
			while (!done) {
				const r = await reader.read();
				if (r.done) break;
				buffer += decoder.decode(r.value, { stream: true });
				let nl: number;
				while ((nl = buffer.indexOf('\n')) !== -1) {
					const line = buffer.slice(0, nl).trim();
					buffer = buffer.slice(nl + 1);
					if (!line) continue;
					let evt: { type: string; text?: string; message?: string };
					try {
						evt = JSON.parse(line);
					} catch {
						continue;
					}
					if (evt.type === 'delta' && evt.text) {
						history[assistantIdx].content += evt.text;
					} else if (evt.type === 'done') {
						done = true;
					} else if (evt.type === 'error') {
						history[assistantIdx].content += `\n\n*[error: ${evt.message ?? 'failed'}]*`;
						done = true;
					}
				}
			}
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				history[assistantIdx].content += '\n\n*[stopped]*';
			} else {
				history[assistantIdx].content += `\n\n*[error: ${err instanceof Error ? err.message : 'unknown'}]*`;
			}
		} finally {
			streaming = false;
			abortCtrl = null;
		}
	}

	let moderatorInput = $state('');
	function submitModerator() {
		const msg = moderatorInput.trim();
		if (!msg) return;
		moderatorInput = '';
		startOrContinue(msg);
	}

	// Parse a streamed assistant turn into typed paragraphs by speaker.
	function parseTurn(text: string, a: Thinker, b: Thinker) {
		const tagA = `[${a.name.toUpperCase()}]`;
		const tagB = `[${b.name.toUpperCase()}]`;
		const lines = text.split(/\n\s*\n/);
		const out: { speaker: 'a' | 'b' | 'meta'; text: string }[] = [];
		for (const raw of lines) {
			const trimmed = raw.trim();
			if (!trimmed) continue;
			if (trimmed.startsWith(tagA)) {
				out.push({ speaker: 'a', text: trimmed.slice(tagA.length).replace(/^[:\s—-]+/, '') });
			} else if (trimmed.startsWith(tagB)) {
				out.push({ speaker: 'b', text: trimmed.slice(tagB.length).replace(/^[:\s—-]+/, '') });
			} else if (trimmed.startsWith('*[')) {
				out.push({ speaker: 'meta', text: trimmed });
			} else {
				// Continuation of the previous paragraph's speaker.
				const last = out[out.length - 1];
				if (last && last.speaker !== 'meta') last.text += '\n\n' + trimmed;
				else out.push({ speaker: 'meta', text: trimmed });
			}
		}
		return out;
	}

	let transcriptEl: HTMLDivElement | undefined = $state();
	let stickToBottom = $state(true);
	function onTranscriptScroll() {
		if (!transcriptEl) return;
		const d = transcriptEl.scrollHeight - transcriptEl.clientHeight - transcriptEl.scrollTop;
		stickToBottom = d <= 80;
	}
	$effect(() => {
		// Auto-follow streaming text if we're pinned to bottom.
		history.length;
		if (history.length > 0) history[history.length - 1].content;
		if (stickToBottom && transcriptEl) {
			requestAnimationFrame(() => {
				if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;
			});
		}
	});

	function lifespan(t: Thinker) {
		if (t.birthYear && t.deathYear) return `${t.birthYear}–${t.deathYear}`;
		if (t.birthYear) return `b. ${t.birthYear}`;
		return '';
	}
</script>

<svelte:head>
	<title>Diffraction Debate · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 sm:px-6">
	<header class="pb-6 pt-12">
		<a href="/play" class="text-xs text-muted transition-colors hover:text-white uppercase">&larr; Play</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Diffraction Debate</h1>
		<p class="mt-2 text-xs text-muted">
			Pick two thinkers from the corpus. Optionally set a topic. They argue, grounded in their corpus passages. You moderate.
		</p>
	</header>

	<!-- Slots -->
	<div class="grid grid-cols-2 gap-3 border-y border-rule py-4 sm:gap-4">
		{#each [thinkerA, thinkerB] as slot, i (i)}
			<div class="rounded border border-rule bg-dark/40 p-3 min-h-[68px]">
				<p class="text-[10px] uppercase tracking-widest text-muted">
					{i === 0 ? 'Thinker A' : 'Thinker B'}
				</p>
				{#if slot}
					<button
						onclick={() => (i === 0 ? (thinkerA = null) : (thinkerB = null))}
						class="mt-1 text-left transition-colors hover:text-bright"
					>
						<p class="font-serif text-lg text-light">{slot.name}</p>
						<p class="text-xs text-muted capitalize">
							{slot.type}{#if lifespan(slot)} · {lifespan(slot)}{/if} · {slot.mentionCount} mentions
						</p>
					</button>
				{:else}
					<p class="mt-1 text-xs text-muted">Pick from below…</p>
				{/if}
			</div>
		{/each}
	</div>
	{#if thinkerA && thinkerB}
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<button
				onclick={swap}
				class="text-xs text-muted underline-offset-2 hover:text-light hover:underline"
			>
				swap
			</button>
			<input
				type="text"
				bind:value={topic}
				placeholder="Optional topic: e.g. 'surveillance', 'the body', 'agency'"
				class="flex-1 border border-rule bg-dark px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-muted"
			/>
			<label class="flex items-center gap-2 text-xs text-muted">
				<span>Length:</span>
				<select
					bind:value={maxExchanges}
					disabled={history.length > 0}
					class="border border-rule bg-dark px-2 py-1 text-xs text-white outline-none focus:border-muted disabled:opacity-50"
				>
					<option value={3}>3 short</option>
					<option value={6}>6 standard</option>
					<option value={10}>10 long</option>
				</select>
			</label>
			{#if history.length === 0}
				<button
					onclick={() => startOrContinue()}
					disabled={streaming}
					class="border border-rule bg-bright/10 px-4 py-2 text-xs text-bright transition-colors hover:bg-bright/20 disabled:opacity-50 uppercase"
				>
					{streaming ? 'Starting…' : 'Start debate'}
				</button>
			{:else}
				<span class="text-xs text-muted tabular-nums">
					exchange {exchangeCount} / {maxExchanges}
				</span>
				<button onclick={reset} class="text-xs text-muted hover:text-light">reset</button>
			{/if}
		</div>
	{/if}

	<!-- Thinker picker -->
	{#if history.length === 0}
		<section class="mt-6">
			<div class="flex flex-wrap items-center gap-2 text-xs">
				<input
					type="search"
					bind:value={query}
					placeholder="Filter by name…"
					class="flex-1 min-w-40 border border-rule bg-dark px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-muted"
				/>
				<button
					onclick={() => (typeFilter = '')}
					class="rounded px-2 py-1 transition-colors {typeFilter === '' ? 'bg-rule/50 text-bright' : 'text-muted hover:text-light'}"
				>
					all
				</button>
				{#each allTypes as [t, n] (t)}
					<button
						onclick={() => (typeFilter = t)}
						class="rounded px-2 py-1 capitalize transition-colors {typeFilter === t ? 'bg-rule/50 text-bright' : 'text-muted hover:text-light'}"
					>
						{t} <span class="text-muted/60">{n}</span>
					</button>
				{/each}
			</div>
			<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each filtered as t (t.slug)}
					{@const selected = thinkerA?.slug === t.slug || thinkerB?.slug === t.slug}
					<button
						onclick={() => pick(t)}
						class="rounded border px-3 py-2 text-left transition-colors {selected ? 'border-bright bg-bright/10' : 'border-rule hover:border-muted hover:bg-rule/30'}"
					>
						<p class="font-serif text-sm text-light truncate">{t.name}</p>
						<p class="mt-0.5 text-xs text-muted capitalize">
							{t.type}
							{#if lifespan(t)} · {lifespan(t)}{/if}
						</p>
						<p class="text-[10px] text-muted/70 tabular-nums">
							{t.mentionCount} mentions{t.hasContext ? ' · noted' : ''}{t.hasWikipedia ? ' · wp' : ''}
						</p>
					</button>
				{/each}
			</div>
			{#if filtered.length === 0}
				<p class="mt-4 text-xs text-muted">No matches. Try a different filter.</p>
			{:else if filtered.length < data.thinkers.length}
				<p class="mt-4 text-xs text-muted">Showing first {filtered.length} matches.</p>
			{/if}
		</section>
	{:else if thinkerA && thinkerB}
		<!-- Transcript -->
		<section class="mt-6">
			<div
				bind:this={transcriptEl}
				onscroll={onTranscriptScroll}
				class="max-h-[60vh] overflow-y-auto rounded border border-rule bg-dark/40 p-4"
			>
				{#each history as turn, i (i)}
					{#if turn.role === 'user'}
						<div class="mb-4 rounded border border-rule/60 bg-rule/20 px-3 py-2 text-xs text-muted">
							<span class="font-mono uppercase">Moderator:</span>
							<span class="font-serif text-sm text-light">{turn.content}</span>
						</div>
					{:else}
						{@const paras = parseTurn(turn.content, thinkerA, thinkerB)}
						<div class="mb-5 space-y-3">
							{#each paras as p, j (j)}
								{#if p.speaker === 'meta'}
									<p class="font-mono text-xs italic text-muted">{p.text}</p>
								{:else}
									{@const isA = p.speaker === 'a'}
									<div class="border-l-2 pl-3 {isA ? 'border-purple-400' : 'border-emerald-400'}">
										<p class="text-[10px] uppercase tracking-widest {isA ? 'text-purple-300' : 'text-emerald-300'}">
											{isA ? thinkerA.name : thinkerB.name}
										</p>
										<p class="mt-1 whitespace-pre-wrap font-serif text-sm leading-relaxed text-light">
											{p.text}
										</p>
									</div>
								{/if}
							{/each}
							{#if i === history.length - 1 && streaming && turn.content.length === 0}
								<p class="text-xs text-muted italic">Setting up the exchange…</p>
							{/if}
						</div>
					{/if}
				{/each}
			</div>

			<!-- Moderator input -->
			{#if debateComplete}
				<div class="mt-3 rounded border border-rule/60 bg-rule/20 p-3 text-xs text-muted">
					<p>Debate complete — {exchangeCount} {exchangeCount === 1 ? 'exchange' : 'exchanges'}.</p>
					<div class="mt-2 flex gap-3">
						<button onclick={reset} class="text-light hover:text-bright">Start a new debate</button>
					</div>
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						submitModerator();
					}}
					class="mt-3 flex items-center gap-2"
				>
					<input
						type="text"
						bind:value={moderatorInput}
						placeholder="Push them: ask a question, force a position, name a contradiction…"
						disabled={streaming}
						class="flex-1 border border-rule bg-dark px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-muted disabled:opacity-50"
					/>
					{#if streaming}
						<button
							type="button"
							onclick={abort}
							class="border border-rule px-3 py-2 text-xs text-light hover:bg-rule/30 uppercase"
						>
							Stop
						</button>
					{:else}
						<button
							type="submit"
							disabled={!moderatorInput.trim()}
							class="border border-rule px-3 py-2 text-xs text-muted hover:border-muted hover:text-light disabled:opacity-30 uppercase"
						>
							Send
						</button>
						<button
							type="button"
							onclick={() => startOrContinue()}
							class="border border-rule px-3 py-2 text-xs text-muted hover:border-muted hover:text-light uppercase"
							title="Let the debate continue without a moderator intervention"
						>
							Continue
						</button>
					{/if}
				</form>
			{/if}
			<p class="mt-2 text-xs text-muted">
				This is a simulation. Each thinker speaks from their corpus passages + Wikipedia + the course context note; it's a careful reconstruction, not channeling.
			</p>
		</section>
	{/if}
</div>
