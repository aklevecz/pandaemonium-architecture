<script lang="ts">
	import { page } from '$app/state';
	// Conway's Life, but with the decisions exposed as controls. The lab asks
	// students to name what a system decided before they arrived; here the
	// neighbourhood, the edge of the world and the rule itself are all knobs,
	// so "who decided the grid was square" stops being rhetorical.
	import { onMount } from 'svelte';

	const CELL = 9; // css px per cell
	const ROWS = 46;

	type Neighbourhood = 'moore' | 'vonneumann';

	let frame: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();

	let cols = $state(90);
	let rows = $state(ROWS);
	let grid = $state.raw(new Uint8Array(90 * ROWS));
	let ghost = $state.raw(new Uint8Array(90 * ROWS)); // just-died, drawn faint

	let running = $state(false);
	let generation = $state(0);
	let speed = $state(10); // generations per second
	let neighbourhood = $state<Neighbourhood>('moore');
	let wrap = $state(true);

	// B3/S23 is Conway. Kept as flag arrays so the rule is editable in the room.
	let birth = $state([false, false, false, true, false, false, false, false, false]);
	let survive = $state([false, false, true, true, false, false, false, false, false]);

	const population = $derived.by(() => {
		let n = 0;
		for (let i = 0; i < grid.length; i++) n += grid[i];
		return n;
	});

	const ruleString = $derived(
		'B' +
			birth.map((b, n) => (b ? n : '')).join('') +
			'/S' +
			survive.map((b, n) => (b ? n : '')).join('')
	);

	// ---- Patterns ----------------------------------------------------------

	const ART: Record<string, string[]> = {
		Glider: ['.O.', '..O', 'OOO'],
		'R-pentomino': ['.OO', 'OO.', '.O.'],
		Acorn: ['.O.....', '...O...', 'OO..OOO'],
		Pulsar: [
			'..OOO...OOO..',
			'.............',
			'O....O.O....O',
			'O....O.O....O',
			'O....O.O....O',
			'..OOO...OOO..',
			'.............',
			'..OOO...OOO..',
			'O....O.O....O',
			'O....O.O....O',
			'O....O.O....O',
			'.............',
			'..OOO...OOO..'
		]
	};

	// Gosper's glider gun — the pattern that settled the bet on whether Life
	// could grow without bound.
	const GUN: [number, number][] = [
		[24, 0],
		[22, 1],
		[24, 1],
		[12, 2],
		[13, 2],
		[20, 2],
		[21, 2],
		[34, 2],
		[35, 2],
		[11, 3],
		[15, 3],
		[20, 3],
		[21, 3],
		[34, 3],
		[35, 3],
		[0, 4],
		[1, 4],
		[10, 4],
		[16, 4],
		[20, 4],
		[21, 4],
		[0, 5],
		[1, 5],
		[10, 5],
		[14, 5],
		[16, 5],
		[17, 5],
		[22, 5],
		[24, 5],
		[10, 6],
		[16, 6],
		[24, 6],
		[11, 7],
		[15, 7],
		[12, 8],
		[13, 8]
	];

	function artToCoords(art: string[]): [number, number][] {
		const out: [number, number][] = [];
		art.forEach((line, y) => {
			[...line].forEach((ch, x) => {
				if (ch === 'O') out.push([x, y]);
			});
		});
		return out;
	}

	function place(coords: [number, number][], atX: number, atY: number) {
		const g = new Uint8Array(cols * rows);
		for (const [x, y] of coords) {
			const cx = atX + x;
			const cy = atY + y;
			if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) g[cy * cols + cx] = 1;
		}
		grid = g;
		ghost = new Uint8Array(cols * rows);
		generation = 0;
	}

	function loadPattern(name: string) {
		const coords = name === 'Gosper gun' ? GUN : artToCoords(ART[name]);
		const w = Math.max(...coords.map((c) => c[0])) + 1;
		const h = Math.max(...coords.map((c) => c[1])) + 1;
		place(coords, Math.floor((cols - w) / 2), Math.floor((rows - h) / 2));
	}

	function clear() {
		grid = new Uint8Array(cols * rows);
		ghost = new Uint8Array(cols * rows);
		generation = 0;
		running = false;
	}

	function randomise() {
		const g = new Uint8Array(cols * rows);
		for (let i = 0; i < g.length; i++) g[i] = Math.random() < 0.28 ? 1 : 0;
		grid = g;
		ghost = new Uint8Array(cols * rows);
		generation = 0;
	}

	// ---- The rule -----------------------------------------------------------

	function step() {
		const next = new Uint8Array(cols * rows);
		const dead = new Uint8Array(cols * rows);
		const moore = neighbourhood === 'moore';
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				let n = 0;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dy === 0) continue;
						if (!moore && dx !== 0 && dy !== 0) continue; // von Neumann: orthogonal only
						let nx = x + dx;
						let ny = y + dy;
						if (wrap) {
							nx = (nx + cols) % cols;
							ny = (ny + rows) % rows;
						} else if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
							continue; // off the edge counts as dead
						}
						n += grid[ny * cols + nx];
					}
				}
				const i = y * cols + x;
				const alive = grid[i] === 1;
				const lives = alive ? survive[n] : birth[n];
				next[i] = lives ? 1 : 0;
				if (alive && !lives) dead[i] = 1;
			}
		}
		grid = next;
		ghost = dead;
		generation += 1;
	}

	// ---- Drawing ------------------------------------------------------------

	// Canvas needs literal colours, and the palette flips with the theme, so the
	// values are re-read whenever the theme class changes.
	let colours = { live: '#ffffff', ghost: '#333333', bg: '#0a0a0a', grid: '#141414' };

	function readColours() {
		const cs = getComputedStyle(document.documentElement);
		const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
		colours = {
			live: v('--color-bright', '#ffffff'),
			ghost: v('--color-rule', '#333333'),
			bg: v('--color-ink', '#0a0a0a'),
			grid: v('--color-dark', '#141414')
		};
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;
		const w = cols * CELL;
		const h = rows * CELL;
		if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = colours.bg;
		ctx.fillRect(0, 0, w, h);

		// Faint lattice, so an empty board still reads as a world with cells.
		ctx.strokeStyle = colours.grid;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let x = 0; x <= cols; x++) {
			ctx.moveTo(x * CELL + 0.5, 0);
			ctx.lineTo(x * CELL + 0.5, h);
		}
		for (let y = 0; y <= rows; y++) {
			ctx.moveTo(0, y * CELL + 0.5);
			ctx.lineTo(w, y * CELL + 0.5);
		}
		ctx.stroke();

		ctx.fillStyle = colours.ghost;
		for (let i = 0; i < ghost.length; i++) {
			if (!ghost[i]) continue;
			const x = (i % cols) * CELL;
			const y = Math.floor(i / cols) * CELL;
			ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
		}

		ctx.fillStyle = colours.live;
		for (let i = 0; i < grid.length; i++) {
			if (!grid[i]) continue;
			const x = (i % cols) * CELL;
			const y = Math.floor(i / cols) * CELL;
			ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
		}
	}

	// Redraw whenever the board or the palette changes.
	$effect(() => {
		grid;
		ghost;
		cols;
		rows;
		draw();
	});

	// ---- Painting -----------------------------------------------------------

	let painting = $state(false);
	let paintValue = 1;

	function cellAt(e: PointerEvent): number | null {
		if (!canvas) return null;
		const r = canvas.getBoundingClientRect();
		const x = Math.floor(((e.clientX - r.left) / r.width) * cols);
		const y = Math.floor(((e.clientY - r.top) / r.height) * rows);
		if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
		return y * cols + x;
	}

	function paint(e: PointerEvent) {
		const i = cellAt(e);
		if (i === null || grid[i] === paintValue) return;
		const g = new Uint8Array(grid);
		g[i] = paintValue;
		grid = g;
	}

	function onPointerDown(e: PointerEvent) {
		const i = cellAt(e);
		if (i === null) return;
		e.preventDefault();
		painting = true;
		paintValue = grid[i] ? 0 : 1; // first cell decides draw or erase
		canvas?.setPointerCapture(e.pointerId);
		paint(e);
	}

	function onPointerMove(e: PointerEvent) {
		if (painting) paint(e);
	}

	function onPointerUp() {
		painting = false;
	}

	// ---- Loop and lifecycle -------------------------------------------------

	onMount(() => {
		readColours();
		const themeWatch = new MutationObserver(() => {
			readColours();
			draw();
		});
		themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		// Fit the board to the frame, preserving whatever is already alive.
		const fit = () => {
			if (!frame) return;
			const next = Math.max(24, Math.floor(frame.clientWidth / CELL));
			if (next === cols) return;
			const g = new Uint8Array(next * rows);
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < Math.min(next, cols); x++) g[y * next + x] = grid[y * cols + x];
			}
			cols = next;
			grid = g;
			ghost = new Uint8Array(next * rows);
		};
		const ro = new ResizeObserver(fit);
		if (frame) ro.observe(frame);
		fit();
		loadPattern('Gosper gun');

		return () => {
			ro.disconnect();
			themeWatch.disconnect();
		};
	});

	$effect(() => {
		if (!running) return;
		const id = setInterval(step, 1000 / speed);
		return () => clearInterval(id);
	});

	function onKeydown(e: KeyboardEvent) {
		const t = e.target as HTMLElement | null;
		if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)) return;
		if (e.key === ' ') {
			e.preventDefault();
			running = !running;
		} else if (e.key === 's') {
			e.preventDefault();
			step();
		}
	}

	// When the deck opened this page, ?lab and ?slide say which slide — the
	// back link returns there rather than to the top of the presentation.
	const backHref = $derived.by(() => {
		const lab = page.url.searchParams.get('lab');
		const slide = page.url.searchParams.get('slide');
		if (!lab) return '/lab/1';
		return `/lab/${lab}${slide ? `?s=${slide}` : ''}`;
	});
	const backLabel = $derived.by(() => {
		const lab = page.url.searchParams.get('lab');
		const slide = page.url.searchParams.get('slide');
		if (!lab) return 'Lab 01';
		return `Lab ${lab.padStart(2, '0')}${slide ? ` · slide ${slide.padStart(2, '0')}` : ''}`;
	});
</script>

<svelte:head>
	<title>Life · Pandaemonium Architecture</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<div class="mx-auto max-w-5xl px-4 sm:px-6">
	<header class="pt-12 pb-6">
		<a href={backHref} class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; {backLabel}</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Life</h1>
		<p class="mt-3 max-w-2xl font-serif text-base leading-relaxed text-gray">
			A cell with two or three live neighbours stays alive. A dead cell with exactly three becomes
			alive. Everything else dies or stays dead. That is the entire specification, and every part of
			it below is a decision somebody made.
		</p>
	</header>

	<!-- Board -->
	<div bind:this={frame} class="overflow-hidden rounded border border-rule">
		<canvas
			bind:this={canvas}
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			class="block touch-none"
			aria-label="Cellular automaton board. drag to draw cells"
		></canvas>
	</div>

	<!-- Transport -->
	<div class="mt-4 flex flex-wrap items-center gap-2">
		<button
			type="button"
			onclick={() => (running = !running)}
			class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
		>
			{running ? 'Pause' : 'Run'}
		</button>
		<button
			type="button"
			onclick={step}
			class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
			>Step</button
		>
		<button
			type="button"
			onclick={clear}
			class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
			>Clear</button
		>
		<button
			type="button"
			onclick={randomise}
			class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
			>Random</button
		>

		<span class="ml-2 flex items-center gap-2">
			<span class="text-[10px] tracking-widest text-muted uppercase">Speed</span>
			{#each [2, 10, 30] as s (s)}
				<button
					type="button"
					onclick={() => (speed = s)}
					class="rounded border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors {speed ===
					s
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">{s}</button
				>
			{/each}
		</span>

		<span class="ml-auto flex items-baseline gap-4 font-mono text-xs text-muted tabular-nums">
			<span>gen {generation}</span>
			<span>pop {population}</span>
			<span>{cols}&times;{rows}</span>
		</span>
	</div>

	<!-- Patterns -->
	<div class="mt-6 flex flex-wrap items-center gap-2 border-t border-rule pt-5">
		<span class="text-[10px] tracking-widest text-muted uppercase">Patterns</span>
		{#each ['Glider', 'Gosper gun', 'R-pentomino', 'Acorn', 'Pulsar'] as name (name)}
			<button
				type="button"
				onclick={() => loadPattern(name)}
				class="rounded border border-rule px-3 py-1.5 text-xs text-light transition-colors hover:border-muted hover:text-bright"
				>{name}</button
			>
		{/each}
	</div>

	<!-- The decisions -->
	<section class="mt-6 grid gap-6 border-t border-rule pt-6 sm:grid-cols-2">
		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">What counts as a neighbour</p>
			<div class="mt-3 flex gap-2">
				<button
					type="button"
					onclick={() => (neighbourhood = 'moore')}
					class="rounded border px-3 py-1.5 text-xs transition-colors {neighbourhood === 'moore'
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Moore (8)</button
				>
				<button
					type="button"
					onclick={() => (neighbourhood = 'vonneumann')}
					class="rounded border px-3 py-1.5 text-xs transition-colors {neighbourhood ===
					'vonneumann'
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">von Neumann (4)</button
				>
			</div>
			<p class="mt-3 font-serif text-sm leading-relaxed text-muted">
				Conway counts diagonals. Drop them and every pattern in the menu dies or degenerates. the
				gliders were never in the rule, they were in the neighbourhood.
			</p>
		</div>

		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">Where the edge of the world is</p>
			<div class="mt-3 flex gap-2">
				<button
					type="button"
					onclick={() => (wrap = true)}
					class="rounded border px-3 py-1.5 text-xs transition-colors {wrap
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Wraps (torus)</button
				>
				<button
					type="button"
					onclick={() => (wrap = false)}
					class="rounded border px-3 py-1.5 text-xs transition-colors {!wrap
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Walled</button
				>
			</div>
			<p class="mt-3 font-serif text-sm leading-relaxed text-muted">
				A glider that leaves a walled board is gone; on a torus it comes back and collides with its
				own past. Neither is more natural. both are somebody's choice about what happens off-screen.
			</p>
		</div>

		<div class="sm:col-span-2">
			<div class="flex items-baseline justify-between">
				<p class="text-[10px] tracking-widest text-muted uppercase">Who decided the rule</p>
				<p class="font-mono text-xs text-light tabular-nums">{ruleString}</p>
			</div>
			<div class="mt-3 space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<span class="w-16 text-xs text-muted">Birth</span>
					{#each birth as on, n (n)}
						<button
							type="button"
							onclick={() => (birth[n] = !birth[n])}
							class="h-7 w-7 rounded border font-mono text-xs tabular-nums transition-colors {on
								? 'border-bright text-bright'
								: 'border-rule text-muted hover:text-light'}"
							aria-pressed={on}
							aria-label="Birth on {n} neighbours">{n}</button
						>
					{/each}
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<span class="w-16 text-xs text-muted">Survival</span>
					{#each survive as on, n (n)}
						<button
							type="button"
							onclick={() => (survive[n] = !survive[n])}
							class="h-7 w-7 rounded border font-mono text-xs tabular-nums transition-colors {on
								? 'border-bright text-bright'
								: 'border-rule text-muted hover:text-light'}"
							aria-pressed={on}
							aria-label="Survival on {n} neighbours">{n}</button
						>
					{/each}
				</div>
			</div>
			<p class="mt-3 max-w-2xl font-serif text-sm leading-relaxed text-muted">
				B3/S23 is Conway's, arrived at by hand over months of play because it sat on the edge
				between dying out and filling up. Try B36/S23 (HighLife, which self-replicates), or B1/S1,
				and watch a universe with no interesting middle.
			</p>
		</div>
	</section>

	<!-- Why -->
	<section class="prose mt-12 pb-24">
		<h2>Nothing here was inevitable</h2>
		<p>
			Von Neumann and Ulam were after a machine that could build a copy of itself, and the grid was
			a way to make that question answerable: discrete cells, discrete time, one rule applied
			everywhere at once. Conway's rule is a later, much smaller instance of the same setup, tuned
			by hand until it did something neither obviously dead nor obviously explosive.
		</p>
		<p>
			The point of the controls above is that every one of them was set by a person before you
			arrived, and none of them announces itself in the output. You watch a glider cross the screen
			and it looks like a fact about the world. It is a fact about a neighbourhood definition.
		</p>
		<p><a href="/lab/1">Back to Lab 01</a>.</p>
	</section>
</div>
