<script lang="ts">
	let { data } = $props();

	interface ReadingChoice {
		slug: string;
		title: string;
		author: string;
		tldr: string | null;
	}

	interface Turn {
		role: 'user' | 'assistant';
		content: string;
	}

	interface ParsedScene {
		prose: string;
		choices: string[];
		ended: boolean;
		synthesis: string;
	}

	let picked: ReadingChoice | null = $state(null);
	let history: Turn[] = $state([]);
	let streaming = $state(false);
	let abortCtrl: AbortController | null = null;
	let query = $state('');

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data.readings;
		return data.readings.filter(
			(r) => r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q)
		);
	});

	function parseScene(text: string): ParsedScene {
		// Format from the prompt:
		//   <prose>
		//   ---
		//   1. choice
		//   2. choice
		//   3. choice (optional)
		// On end:
		//   <prose>
		//   ---
		//   [END]
		//   <synthesis>
		const endIdx = text.indexOf('[END]');
		if (endIdx !== -1) {
			// Find the most recent "---" before [END]
			const head = text.slice(0, endIdx);
			const sepBefore = head.lastIndexOf('---');
			const prose = sepBefore >= 0 ? head.slice(0, sepBefore).trim() : head.trim();
			const synthesis = text
				.slice(endIdx + '[END]'.length)
				.trim();
			return { prose, choices: [], ended: true, synthesis };
		}
		const lastSep = text.lastIndexOf('---');
		if (lastSep === -1) return { prose: text.trim(), choices: [], ended: false, synthesis: '' };
		const prose = text.slice(0, lastSep).trim();
		const tail = text.slice(lastSep + 3).trim();
		const choices = tail
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => /^\d+[.)]\s*/.test(l))
			.map((l) => l.replace(/^\d+[.)]\s*/, ''));
		return { prose, choices, ended: false, synthesis: '' };
	}

	const lastScene = $derived.by<ParsedScene | null>(() => {
		for (let i = history.length - 1; i >= 0; i--) {
			if (history[i].role === 'assistant') return parseScene(history[i].content);
		}
		return null;
	});

	async function fire(message: string | null) {
		if (!picked || streaming) return;
		streaming = true;
		const controller = new AbortController();
		abortCtrl = controller;
		if (message) history = [...history, { role: 'user', content: message }];
		history = [...history, { role: 'assistant', content: '' }];
		const assistantIdx = history.length - 1;
		try {
			const res = await fetch('/api/play/adventure', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: controller.signal,
				body: JSON.stringify({
					readingSlug: picked.slug,
					readingTitle: picked.title,
					readingAuthor: picked.author,
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
					if (evt.type === 'delta' && evt.text) history[assistantIdx].content += evt.text;
					else if (evt.type === 'done') done = true;
					else if (evt.type === 'error') {
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

	function choose(label: string) {
		fire(label);
	}
	function abort() {
		abortCtrl?.abort();
	}
	function restart() {
		if (streaming) abortCtrl?.abort();
		history = [];
	}
	function exit() {
		if (streaming) abortCtrl?.abort();
		history = [];
		picked = null;
	}

	// Anchor the scene container so it auto-scrolls to new content.
	let proseEl: HTMLDivElement | undefined = $state();
	$effect(() => {
		history.length;
		if (history.length > 0) history[history.length - 1].content;
		if (proseEl) requestAnimationFrame(() => proseEl?.scrollTo({ top: proseEl.scrollHeight, behavior: 'smooth' }));
	});
</script>

<svelte:head>
	<title>Theory Adventure · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pb-6 pt-12">
		<a href="/play" class="text-xs text-muted transition-colors hover:text-white uppercase">&larr; Play</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Theory Adventure</h1>
		<p class="mt-2 text-xs text-muted">
			Pick a reading. Claude drops you into a scene set in its world. You choose how to act; the scene routes around the reading's concepts. After ~6 scenes you get a synthesis with links back to the actual text.
		</p>
	</header>

	{#if !picked}
		<!-- Reading picker -->
		<section class="border-y border-rule py-4">
			<input
				type="search"
				bind:value={query}
				placeholder="Filter readings…"
				class="w-full border border-rule bg-dark px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-muted"
			/>
		</section>
		<section class="py-6 pb-24">
			<p class="mb-4 text-xs uppercase tracking-widest text-muted">{filtered.length} readings</p>
			<div class="space-y-3">
				{#each filtered as r (r.slug)}
					<button
						onclick={() => {
							picked = r;
							history = [];
							fire(null);
						}}
						class="group block w-full rounded border border-rule bg-dark/30 p-4 text-left transition-colors hover:border-muted hover:bg-rule/20"
					>
						<p class="text-xs text-muted">{r.author}</p>
						<p class="mt-0.5 font-serif text-base text-light group-hover:text-bright">{r.title}</p>
						{#if r.tldr}
							<p class="mt-1 font-serif text-xs leading-relaxed text-muted">{r.tldr}</p>
						{/if}
					</button>
				{/each}
			</div>
		</section>
	{:else}
		<!-- Adventure -->
		<section class="border-y border-rule py-3">
			<div class="flex items-baseline justify-between gap-3">
				<div class="min-w-0">
					<p class="text-xs text-muted">{picked.author}</p>
					<p class="font-serif text-base text-light">{picked.title}</p>
				</div>
				<div class="flex shrink-0 gap-3 text-xs text-muted">
					<button onclick={restart} class="hover:text-light">restart</button>
					<button onclick={exit} class="hover:text-light">change reading</button>
				</div>
			</div>
		</section>

		<section class="py-6 pb-24">
			<div
				bind:this={proseEl}
				class="max-h-[60vh] overflow-y-auto rounded border border-rule bg-dark/30 p-5"
			>
				{#each history as turn, i (i)}
					{#if turn.role === 'user'}
						<div class="mb-5 border-l-2 border-rule pl-3">
							<p class="text-[10px] uppercase tracking-widest text-muted">You chose</p>
							<p class="mt-0.5 font-serif text-sm italic text-light">{turn.content}</p>
						</div>
					{:else}
						{@const parsed = parseScene(turn.content)}
						<div class="mb-6">
							<p class="whitespace-pre-wrap font-serif text-base leading-relaxed text-light">
								{parsed.prose}
							</p>
							{#if parsed.ended && parsed.synthesis}
								<div class="mt-6 rounded border border-rule/60 bg-rule/20 p-4">
									<p class="text-[10px] uppercase tracking-widest text-muted">Synthesis</p>
									<p class="mt-2 font-serif text-sm leading-relaxed text-light">{parsed.synthesis}</p>
									<a
										href="/reading/{picked.slug}"
										class="mt-3 inline-block text-xs text-muted underline hover:text-light"
									>
										Read the text &rarr;
									</a>
								</div>
							{/if}
						</div>
					{/if}
				{/each}

				{#if streaming && (!lastScene || lastScene.prose.length === 0)}
					<p class="text-xs italic text-muted">Composing the next scene…</p>
				{/if}
			</div>

			<!-- Choices -->
			{#if lastScene && !lastScene.ended && !streaming && lastScene.choices.length > 0}
				<div class="mt-4 space-y-2">
					{#each lastScene.choices as c (c)}
						<button
							onclick={() => choose(c)}
							class="block w-full rounded border border-rule bg-dark/40 px-4 py-3 text-left font-serif text-sm text-light transition-colors hover:border-muted hover:bg-rule/30 hover:text-bright"
						>
							{c}
						</button>
					{/each}
				</div>
			{/if}

			{#if streaming}
				<div class="mt-4 flex justify-end">
					<button onclick={abort} class="text-xs text-muted hover:text-light underline-offset-2 hover:underline">
						stop
					</button>
				</div>
			{:else if lastScene?.ended}
				<div class="mt-4 flex flex-wrap gap-3">
					<button onclick={restart} class="border border-rule px-3 py-2 text-xs text-light hover:bg-rule/30 uppercase">
						Play again
					</button>
					<button onclick={exit} class="border border-rule px-3 py-2 text-xs text-muted hover:text-light uppercase">
						Different reading
					</button>
				</div>
			{/if}
		</section>
	{/if}
</div>
