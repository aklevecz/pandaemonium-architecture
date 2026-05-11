<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { data } = $props();

	interface RawNode {
		id: string;
		name: string;
		type: string;
		mentionCount: number;
		degree: number;
		birthYear: number | null;
		deathYear: number | null;
	}
	interface SimNode extends RawNode {
		x: number;
		y: number;
		vx: number;
		vy: number;
		fx?: number;
		fy?: number;
	}
	interface RawEdge {
		source: string;
		target: string;
		weight: number;
	}

	// Defaults tuned so the initial view is the densely-connected core of the
	// corpus, not the whole hairball. Sliders unwind from there.
	let minMentions = $state(5);
	let minEdgeWeight = $state(3);
	let typeFilter = $state<string>('');
	let nameQuery = $state('');
	let focusedId = $state<string | null>(null);

	const allTypes = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const n of data.nodes) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
	});

	const filteredNodes = $derived.by(() => {
		const set = new Set(
			data.nodes
				.filter((n) => n.mentionCount >= minMentions)
				.filter((n) => (typeFilter ? n.type === typeFilter : true))
				.map((n) => n.id)
		);
		// Drop orphans (no surviving edge).
		const keptByEdge = new Set<string>();
		for (const e of data.edges) {
			if (e.weight < minEdgeWeight) continue;
			if (!set.has(e.source) || !set.has(e.target)) continue;
			keptByEdge.add(e.source);
			keptByEdge.add(e.target);
		}
		return data.nodes.filter((n) => keptByEdge.has(n.id));
	});

	const filteredEdges = $derived.by(() => {
		const set = new Set(filteredNodes.map((n) => n.id));
		return data.edges.filter(
			(e) => e.weight >= minEdgeWeight && set.has(e.source) && set.has(e.target)
		);
	});

	// "Focus" state — when a node is selected, build a set of its first-degree
	// neighbors so the renderer can fade everything else. Click again or clear
	// to drop focus.
	const focusedSet = $derived.by(() => {
		if (!focusedId) return null;
		const set = new Set<string>([focusedId]);
		for (const e of filteredEdges) {
			if (e.source === focusedId) set.add(e.target);
			else if (e.target === focusedId) set.add(e.source);
		}
		return set;
	});

	// Search: when the user types a name, find the closest match and focus it
	// — that's the most direct way to "find Foucault on the graph".
	function findMatch(q: string) {
		const needle = q.trim().toLowerCase();
		if (needle.length < 2) return null;
		const candidates = filteredNodes.filter((n) => n.name.toLowerCase().includes(needle));
		if (!candidates.length) return null;
		// Prefer prefix matches; fall back to substring.
		const prefix = candidates.filter((n) => n.name.toLowerCase().startsWith(needle));
		const best = (prefix[0] ?? candidates[0]) as RawNode;
		return best.id;
	}
	function submitSearch() {
		const id = findMatch(nameQuery);
		if (id) focusedId = id;
	}

	let simNodes: SimNode[] = $state([]);
	let viewportW = $state(900);
	let viewportH = $state(600);
	let svgEl: SVGSVGElement | undefined = $state();
	let hover: SimNode | null = $state(null);
	let dragging: SimNode | null = null;
	let raf = 0;
	let dragMoved = false;

	const TYPE_COLORS: Record<string, string> = {
		philosopher: '#a78bfa',
		theorist: '#a78bfa',
		artist: '#f472b6',
		scientist: '#60a5fa',
		writer: '#fbbf24',
		musician: '#fb7185',
		engineer: '#4ade80',
		filmmaker: '#fcd34d',
		psychoanalyst: '#a78bfa',
		economist: '#34d399',
		mathematician: '#60a5fa',
		theologian: '#9ca3af',
		politician: '#fda4af',
		historical: '#9ca3af',
		fictional: '#94a3b8',
		other: '#9ca3af'
	};
	const colorFor = (type: string) => TYPE_COLORS[type] ?? '#9ca3af';

	// Labels appear on nodes whose degree is in the top 25% of the visible
	// set. That highlights "who matters" without spamming every node.
	const labelThreshold = $derived.by(() => {
		if (filteredNodes.length === 0) return Infinity;
		const sorted = [...filteredNodes].map((n) => n.degree).sort((a, b) => b - a);
		const idx = Math.max(0, Math.floor(sorted.length * 0.25) - 1);
		return sorted[idx] ?? 0;
	});

	function initSim() {
		const cx = viewportW / 2;
		const cy = viewportH / 2;
		const radius = Math.min(viewportW, viewportH) * 0.4;
		simNodes = filteredNodes.map((n, i) => {
			const angle = (i / Math.max(1, filteredNodes.length)) * Math.PI * 2;
			return {
				...n,
				x: cx + Math.cos(angle) * radius,
				y: cy + Math.sin(angle) * radius,
				vx: 0,
				vy: 0
			};
		});
	}

	function step() {
		if (!simNodes.length) return;
		const cx = viewportW / 2;
		const cy = viewportH / 2;
		const idToNode = new Map(simNodes.map((n) => [n.id, n]));
		const REPEL = 1600; // bigger → more spread out
		const IDEAL = 140;
		const SPRING = 0.012;
		const GRAVITY = 0.0015;
		const DAMPING = 0.84;

		for (let i = 0; i < simNodes.length; i++) {
			for (let j = i + 1; j < simNodes.length; j++) {
				const a = simNodes[i];
				const b = simNodes[j];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const distSq = dx * dx + dy * dy + 0.01;
				const f = REPEL / distSq;
				const d = Math.sqrt(distSq);
				const fx = (dx / d) * f;
				const fy = (dy / d) * f;
				a.vx -= fx;
				a.vy -= fy;
				b.vx += fx;
				b.vy += fy;
			}
		}
		for (const e of filteredEdges) {
			const a = idToNode.get(e.source);
			const b = idToNode.get(e.target);
			if (!a || !b) continue;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;
			const k = SPRING * Math.log(1 + e.weight);
			const f = (dist - IDEAL) * k;
			const fx = (dx / dist) * f;
			const fy = (dy / dist) * f;
			a.vx += fx;
			a.vy += fy;
			b.vx -= fx;
			b.vy -= fy;
		}
		for (const n of simNodes) {
			n.vx += (cx - n.x) * GRAVITY;
			n.vy += (cy - n.y) * GRAVITY;
		}
		for (const n of simNodes) {
			if (n.fx != null) {
				n.x = n.fx;
				n.y = n.fy ?? n.y;
				n.vx = 0;
				n.vy = 0;
				continue;
			}
			n.vx *= DAMPING;
			n.vy *= DAMPING;
			n.x += n.vx;
			n.y += n.vy;
			n.x = Math.max(20, Math.min(viewportW - 20, n.x));
			n.y = Math.max(20, Math.min(viewportH - 20, n.y));
		}
		simNodes = simNodes;
		raf = requestAnimationFrame(step);
	}

	$effect(() => {
		filteredNodes.length;
		typeFilter;
		minMentions;
		minEdgeWeight;
		if (browser) initSim();
	});

	onMount(() => {
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				viewportW = Math.floor(e.contentRect.width);
				viewportH = Math.max(500, Math.floor(window.innerHeight - 220));
			}
		});
		if (svgEl?.parentElement) ro.observe(svgEl.parentElement);
		raf = requestAnimationFrame(step);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});

	function nodeRadius(n: { mentionCount: number }) {
		return 4 + Math.sqrt(n.mentionCount) * 2;
	}

	function pointerDown(e: PointerEvent, n: SimNode) {
		dragging = n;
		dragMoved = false;
		n.fx = n.x;
		n.fy = n.y;
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}
	function pointerMove(e: PointerEvent) {
		if (!dragging || !svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		dragging.fx = e.clientX - rect.left;
		dragging.fy = e.clientY - rect.top;
		dragMoved = true;
	}
	function pointerUp(e: PointerEvent, n: SimNode) {
		if (!dragMoved) {
			// Treat as a click: toggle focus rather than navigate. A second
			// tap on the focused node navigates to its page.
			if (focusedId === n.id) {
				window.location.href = `/people/${n.id}`;
			} else {
				focusedId = n.id;
			}
		}
		dragging = null;
		n.fx = undefined;
		n.fy = undefined;
		dragMoved = false;
	}

	function isVisibleInFocus(id: string) {
		return !focusedSet || focusedSet.has(id);
	}
	function edgeInFocus(e: RawEdge) {
		return !focusedSet || focusedSet.has(e.source) || focusedSet.has(e.target);
	}
</script>

<svelte:head>
	<title>People · Network · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 sm:px-6">
	<header class="pb-6 pt-12">
		<a href="/people" class="text-xs text-muted transition-colors hover:text-white uppercase">&larr; People</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Network</h1>
		<p class="mt-2 text-xs text-muted">
			Co-occurrence within reading chunks. Two people are connected if they show up in the same passage; thickness scales with how often. Tap a node to focus on its neighbors; tap again to open its page.
		</p>
	</header>

	<div class="flex flex-col gap-3 border-y border-rule py-3 text-xs">
		<div class="flex flex-wrap items-center gap-4">
			<label class="flex items-center gap-2">
				<span class="text-muted">Min mentions:</span>
				<input type="range" min="1" max="20" bind:value={minMentions} class="w-32" />
				<span class="font-mono text-light tabular-nums">{minMentions}</span>
			</label>
			<label class="flex items-center gap-2">
				<span class="text-muted">Min edge weight:</span>
				<input type="range" min="1" max="10" bind:value={minEdgeWeight} class="w-32" />
				<span class="font-mono text-light tabular-nums">{minEdgeWeight}</span>
			</label>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					submitSearch();
				}}
				class="ml-auto flex items-center gap-2"
			>
				<input
					type="search"
					bind:value={nameQuery}
					placeholder="Find a person…"
					class="border border-rule bg-dark px-2 py-1 text-xs text-white outline-none placeholder:text-muted focus:border-muted"
				/>
				{#if focusedId}
					<button
						type="button"
						onclick={() => (focusedId = null)}
						class="rounded px-2 py-0.5 text-muted hover:text-light"
					>
						clear focus
					</button>
				{/if}
			</form>
		</div>
		<div class="flex flex-wrap items-center gap-1">
			<span class="text-muted">Type:</span>
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
			<span class="ml-auto text-muted tabular-nums">
				{filteredNodes.length} nodes · {filteredEdges.length} edges
			</span>
		</div>
	</div>

	<div class="relative mt-4 overflow-hidden rounded border border-rule bg-dark">
		<svg
			bind:this={svgEl}
			width={viewportW}
			height={viewportH}
			onpointermove={pointerMove}
			onpointerdown={(e) => {
				// Click on background clears focus
				if (e.target === svgEl) focusedId = null;
			}}
			role="application"
			aria-label="People co-occurrence network"
			class="block"
		>
			<g>
				{#each filteredEdges as e (e.source + ':' + e.target)}
					{@const a = simNodes.find((n) => n.id === e.source)}
					{@const b = simNodes.find((n) => n.id === e.target)}
					{#if a && b}
						<line
							x1={a.x}
							y1={a.y}
							x2={b.x}
							y2={b.y}
							stroke="rgba(180,180,200,{edgeInFocus(e) ? 0.25 : 0.04})"
							stroke-width={Math.min(3, 0.5 + Math.log(1 + e.weight))}
						/>
					{/if}
				{/each}
			</g>
			<g>
				{#each simNodes as n (n.id)}
					{@const visible = isVisibleInFocus(n.id)}
					{@const showLabel = visible && (n.degree >= labelThreshold || focusedId === n.id)}
					<g
						transform="translate({n.x},{n.y})"
						onpointerdown={(e) => pointerDown(e, n)}
						onpointerup={(e) => pointerUp(e, n)}
						onpointerenter={() => (hover = n)}
						onpointerleave={() => (hover = null)}
						style="cursor: pointer; opacity: {visible ? 1 : 0.18}"
						role="button"
						tabindex="0"
						aria-label={n.name}
					>
						<circle
							r={nodeRadius(n)}
							fill={colorFor(n.type)}
							fill-opacity={focusedId === n.id ? 1 : 0.85}
							stroke={focusedId === n.id ? '#fff' : 'rgba(255,255,255,0.4)'}
							stroke-width={focusedId === n.id ? 2 : 0.5}
						/>
						{#if showLabel}
							<text
								x={nodeRadius(n) + 4}
								y="4"
								font-size="11"
								font-family="ui-serif, Georgia, serif"
								fill="rgba(240,240,250,0.92)"
								style="pointer-events: none;"
							>
								{n.name}
							</text>
						{/if}
					</g>
				{/each}
			</g>
		</svg>
		{#if hover && hover !== dragging}
			<div
				class="pointer-events-none absolute z-10 rounded border border-rule bg-black/95 px-3 py-2 text-xs text-light shadow-lg"
				style="left: {Math.min(hover.x + 14, viewportW - 220)}px; top: {Math.min(hover.y + 14, viewportH - 60)}px;"
			>
				<p class="font-serif text-sm text-bright">{hover.name}</p>
				<p class="text-muted">
					<span class="capitalize">{hover.type}</span>
					{#if hover.birthYear || hover.deathYear}
						· {hover.birthYear ?? '?'}–{hover.deathYear ?? ''}
					{/if}
					· {hover.mentionCount} mentions · degree {hover.degree}
				</p>
				{#if focusedId !== hover.id}
					<p class="text-muted/70">tap to focus · 2nd tap opens page</p>
				{:else}
					<p class="text-muted/70">tap again to open page</p>
				{/if}
			</div>
		{/if}
	</div>

	<section class="py-6 pb-24">
		<details>
			<summary class="cursor-pointer text-xs uppercase tracking-widest text-muted hover:text-light">
				Legend
			</summary>
			<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
				{#each Object.entries(TYPE_COLORS) as [type, color] (type)}
					<span class="flex items-center gap-1.5 capitalize text-muted">
						<span class="inline-block h-2 w-2 rounded-full" style="background: {color}"></span>
						{type}
					</span>
				{/each}
			</div>
		</details>
	</section>
</div>
