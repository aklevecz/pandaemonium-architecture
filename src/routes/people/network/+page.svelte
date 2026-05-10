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

	// Filters
	let minMentions = $state(2);
	let minEdgeWeight = $state(2);

	// Visible subset
	const filteredNodes = $derived.by(() => {
		const set = new Set(data.nodes.filter((n) => n.mentionCount >= minMentions).map((n) => n.id));
		// Drop nodes that have no surviving edge in the filtered graph (they're
		// just orphans floating around).
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

	// Node positions (initialized lazily, run a small force sim manually).
	let simNodes: SimNode[] = $state([]);
	let viewportW = $state(900);
	let viewportH = $state(600);
	let svgEl: SVGSVGElement | undefined = $state();
	let hover: SimNode | null = $state(null);
	let dragging: SimNode | null = null;
	let raf = 0;

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

	function initSim() {
		const cx = viewportW / 2;
		const cy = viewportH / 2;
		const next = filteredNodes.map((n, i) => {
			const angle = (i / Math.max(1, filteredNodes.length)) * Math.PI * 2;
			const r = Math.min(viewportW, viewportH) * 0.35;
			return {
				...n,
				x: cx + Math.cos(angle) * r,
				y: cy + Math.sin(angle) * r,
				vx: 0,
				vy: 0
			};
		});
		simNodes = next;
	}

	function step() {
		if (!simNodes.length) return;
		const cx = viewportW / 2;
		const cy = viewportH / 2;
		const idToNode = new Map(simNodes.map((n) => [n.id, n]));
		// Repulsion between every pair (O(n^2) — fine up to a few hundred nodes).
		const REPEL = 800;
		for (let i = 0; i < simNodes.length; i++) {
			for (let j = i + 1; j < simNodes.length; j++) {
				const a = simNodes[i];
				const b = simNodes[j];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const distSq = dx * dx + dy * dy + 0.01;
				const force = REPEL / distSq;
				const fx = (dx / Math.sqrt(distSq)) * force;
				const fy = (dy / Math.sqrt(distSq)) * force;
				a.vx -= fx;
				a.vy -= fy;
				b.vx += fx;
				b.vy += fy;
			}
		}
		// Spring along edges (attractive). Spring strength scales with weight.
		for (const e of filteredEdges) {
			const a = idToNode.get(e.source);
			const b = idToNode.get(e.target);
			if (!a || !b) continue;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;
			const ideal = 80;
			const k = 0.005 * Math.log(1 + e.weight);
			const f = (dist - ideal) * k;
			const fx = (dx / dist) * f;
			const fy = (dy / dist) * f;
			a.vx += fx;
			a.vy += fy;
			b.vx -= fx;
			b.vy -= fy;
		}
		// Gravity toward center
		for (const n of simNodes) {
			n.vx += (cx - n.x) * 0.002;
			n.vy += (cy - n.y) * 0.002;
		}
		// Damping + integrate
		for (const n of simNodes) {
			if (n.fx != null) {
				n.x = n.fx;
				n.y = n.fy ?? n.y;
				n.vx = 0;
				n.vy = 0;
				continue;
			}
			n.vx *= 0.85;
			n.vy *= 0.85;
			n.x += n.vx;
			n.y += n.vy;
			// Soft viewport bounds
			n.x = Math.max(20, Math.min(viewportW - 20, n.x));
			n.y = Math.max(20, Math.min(viewportH - 20, n.y));
		}
		simNodes = simNodes; // svelte reactivity nudge
		raf = requestAnimationFrame(step);
	}

	$effect(() => {
		// Re-init when filter changes
		filteredNodes.length;
		if (browser) initSim();
	});

	onMount(() => {
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				viewportW = Math.floor(e.contentRect.width);
				viewportH = Math.max(420, Math.floor(window.innerHeight - 200));
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
		n.fx = n.x;
		n.fy = n.y;
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}
	function pointerMove(e: PointerEvent) {
		if (!dragging || !svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		dragging.fx = e.clientX - rect.left;
		dragging.fy = e.clientY - rect.top;
	}
	function pointerUp(_e: PointerEvent, n: SimNode) {
		dragging = null;
		n.fx = undefined;
		n.fy = undefined;
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
			Co-occurrence within reading chunks. An edge means two people show up in the same passage; thickness scales with how often. Drag a node to pin it.
		</p>
	</header>

	<div class="flex flex-wrap items-center gap-4 border-y border-rule py-3 text-xs">
		<label class="flex items-center gap-2">
			<span class="text-muted">Min mentions:</span>
			<input
				type="range"
				min="1"
				max="10"
				bind:value={minMentions}
				class="w-32"
			/>
			<span class="font-mono text-light tabular-nums">{minMentions}</span>
		</label>
		<label class="flex items-center gap-2">
			<span class="text-muted">Min edge weight:</span>
			<input
				type="range"
				min="1"
				max="10"
				bind:value={minEdgeWeight}
				class="w-32"
			/>
			<span class="font-mono text-light tabular-nums">{minEdgeWeight}</span>
		</label>
		<span class="ml-auto text-muted">
			{filteredNodes.length} nodes · {filteredEdges.length} edges
		</span>
	</div>

	<div class="relative mt-4 overflow-hidden rounded border border-rule bg-dark">
		<svg
			bind:this={svgEl}
			width={viewportW}
			height={viewportH}
			onpointermove={pointerMove}
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
							stroke="rgba(180,180,200,0.18)"
							stroke-width={Math.min(3, 0.5 + Math.log(1 + e.weight))}
						/>
					{/if}
				{/each}
			</g>
			<g>
				{#each simNodes as n (n.id)}
					<g
						transform="translate({n.x},{n.y})"
						onpointerdown={(e) => pointerDown(e, n)}
						onpointerup={(e) => pointerUp(e, n)}
						onpointerenter={() => (hover = n)}
						onpointerleave={() => (hover = null)}
						style="cursor: pointer;"
						role="button"
						tabindex="0"
						aria-label={n.name}
					>
						<a href="/people/{n.id}">
							<circle
								r={nodeRadius(n)}
								fill={colorFor(n.type)}
								fill-opacity="0.85"
								stroke="rgba(255,255,255,0.4)"
								stroke-width="0.5"
							/>
						</a>
					</g>
				{/each}
			</g>
		</svg>
		{#if hover}
			<div
				class="pointer-events-none absolute z-10 rounded border border-rule bg-black/95 px-3 py-2 text-xs text-light shadow-lg"
				style="left: {Math.min(hover.x + 14, viewportW - 200)}px; top: {Math.min(hover.y + 14, viewportH - 60)}px;"
			>
				<p class="font-serif text-sm text-bright">{hover.name}</p>
				<p class="text-muted">
					<span class="capitalize">{hover.type}</span>
					{#if hover.birthYear || hover.deathYear}
						· {hover.birthYear ?? '?'}–{hover.deathYear ?? ''}
					{/if}
					· {hover.mentionCount} mentions · degree {hover.degree}
				</p>
			</div>
		{/if}
	</div>

	<section class="py-8 pb-24">
		<p class="text-xs uppercase tracking-widest text-muted">Legend</p>
		<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
			{#each Object.entries(TYPE_COLORS) as [type, color] (type)}
				<span class="flex items-center gap-1.5 capitalize text-muted">
					<span class="inline-block h-2 w-2 rounded-full" style="background: {color}"></span>
					{type}
				</span>
			{/each}
		</div>
	</section>
</div>
