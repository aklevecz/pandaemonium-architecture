<script lang="ts">
	import { page } from '$app/state';
	// A generative music instrument in the Koan → Wotja lineage. The default
	// patch is a common reconstruction of Eno's "2/1" from Music for Airports:
	// seven voices, one note each, loop lengths chosen so they never line up.
	// As on /life, the decisions are the controls — the scale, the loop table,
	// the envelope — so "who decided this" has a knob to point at.
	import { onMount } from 'svelte';

	interface Voice {
		id: number;
		midi: number;
		period: number; // seconds between firings
		muted: boolean;
	}

	const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
	const LOW = 48; // C3
	const HIGH = 84; // C6
	// Scheduling horizon. Generous, so a background-throttled timer (1s ticks)
	// still hands the audio clock its notes early enough.
	const LOOKAHEAD = 2.6;

	const SCALES: Record<string, number[]> = {
		Major: [0, 2, 4, 5, 7, 9, 11],
		'Major pentatonic': [0, 2, 4, 7, 9],
		Dorian: [0, 2, 3, 5, 7, 10],
		'Whole-tone': [0, 2, 4, 6, 8, 10],
		Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
	};

	let rootPc = $state(1); // Db
	let scaleName = $state('Major');
	let timbre = $state<'sine' | 'triangle'>('sine');
	let envelope = $state<'swell' | 'struck'>('swell');
	let drift = $state(0); // probability, per firing, that a voice re-decides its pitch
	let volume = $state(0.8);

	// After a common reconstruction of 2/1 (1978): pitch, loop length.
	let voices = $state<Voice[]>([
		{ id: 1, midi: 65, period: 19.6, muted: false }, // F4
		{ id: 2, midi: 68, period: 17.8, muted: false }, // Ab4
		{ id: 3, midi: 72, period: 20.1, muted: false }, // C5
		{ id: 4, midi: 73, period: 31.8, muted: false }, // Db5
		{ id: 5, midi: 75, period: 32.4, muted: false }, // Eb5
		{ id: 6, midi: 77, period: 21.3, muted: false }, // F5
		{ id: 7, midi: 80, period: 16.2, muted: false } // Ab5
	]);
	let nextId = 8;

	let running = $state(false);
	let now = $state(0);
	let firedCount = $state(0);

	const scaleNotes = $derived.by(() => {
		const iv = SCALES[scaleName];
		const out: number[] = [];
		for (let m = LOW; m <= HIGH; m++) if (iv.includes((m - rootPc + 120) % 12)) out.push(m);
		return out;
	});

	function noteName(m: number) {
		return NAMES[m % 12] + (Math.floor(m / 12) - 1);
	}

	// When the scale or root changes, every voice snaps to the nearest note it
	// is still allowed to sing.
	$effect(() => {
		const notes = scaleNotes;
		for (const v of voices) {
			if (!notes.includes(v.midi)) {
				let best = notes[0];
				for (const n of notes) if (Math.abs(n - v.midi) < Math.abs(best - v.midi)) best = n;
				v.midi = best;
			}
		}
	});

	function stepVoice(v: Voice, dir: number) {
		const notes = scaleNotes;
		let idx = 0;
		let bestD = Infinity;
		notes.forEach((n, i) => {
			const d = Math.abs(n - v.midi);
			if (d < bestD) {
				bestD = d;
				idx = i;
			}
		});
		v.midi = notes[Math.max(0, Math.min(notes.length - 1, idx + dir))];
	}

	// How long until the whole table lines up again: LCM of the loop lengths in
	// tenths of a second. BigInt, because the honest answer is often centuries.
	const repeatText = $derived.by(() => {
		if (drift > 0) return 'never: drift re-decides a pitch at every firing';
		const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
		let l = 1n;
		for (const v of voices) {
			const p = BigInt(Math.max(1, Math.round(v.period * 10)));
			l = (l / gcd(l, p)) * p;
		}
		const secs = l / 10n;
		const YEAR = 31557600n;
		if (secs >= 1000n * YEAR) return `once every ≈${(secs / YEAR).toLocaleString()} years`;
		const s = Number(secs);
		if (s < 90) return `every ${s.toFixed(0)} seconds`;
		if (s < 5400) return `every ${(s / 60).toFixed(1)} minutes`;
		if (s < 129600) return `every ${(s / 3600).toFixed(1)} hours`;
		if (s < 2 * 31557600) return `every ${(s / 86400).toFixed(1)} days`;
		return `once every ≈${Math.round(s / 31557600).toLocaleString()} years`;
	});

	// ---- Audio ---------------------------------------------------------------

	let ctx: AudioContext | null = null;
	let master: GainNode | null = null;
	let send: GainNode | null = null;
	const nextFire = new Map<number, number>();
	let events: { t: number; midi: number }[] = [];

	function ensureAudio() {
		if (ctx) return;
		ctx = new AudioContext();
		master = ctx.createGain();
		master.gain.value = volume;
		master.connect(ctx.destination);
		// One fixed room: a filtered feedback delay. A decision, not a control.
		send = ctx.createGain();
		send.gain.value = 0.35;
		const delay = ctx.createDelay(2);
		delay.delayTime.value = 0.48;
		const fb = ctx.createGain();
		fb.gain.value = 0.38;
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 2400;
		send.connect(delay);
		delay.connect(lp);
		lp.connect(fb);
		fb.connect(delay);
		lp.connect(master);
	}

	function playNote(midi: number, t: number) {
		if (!ctx || !master || !send) return;
		const att = envelope === 'swell' ? 1.6 : 0.012;
		const rel = envelope === 'swell' ? 5.5 : 4.2;
		const live = Math.max(1, voices.filter((v) => !v.muted).length);
		const peak = (envelope === 'swell' ? 0.17 : 0.12) / Math.sqrt(live);
		const f = 440 * 2 ** ((midi - 69) / 12);
		const g = ctx.createGain();
		g.connect(master);
		g.connect(send);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(peak, t + att);
		g.gain.exponentialRampToValueAtTime(0.0008, t + att + rel);
		g.gain.linearRampToValueAtTime(0, t + att + rel + 0.08);
		// Two slightly detuned oscillators per note, for width.
		for (const d of [-3.5, 3.5]) {
			const o = ctx.createOscillator();
			o.type = timbre;
			o.frequency.value = f;
			o.detune.value = d;
			o.connect(g);
			o.start(t);
			o.stop(t + att + rel + 0.15);
		}
	}

	function schedulerTick() {
		if (!ctx) return;
		const horizon = ctx.currentTime + LOOKAHEAD;
		for (const v of voices) {
			// A fresh voice enters at a random phase, like dropping the needle
			// on a running loop.
			let t = nextFire.get(v.id) ?? ctx.currentTime + 0.1 + Math.random() * v.period;
			while (t < horizon) {
				if (!v.muted) {
					playNote(v.midi, Math.max(t, ctx.currentTime + 0.03));
					events.push({ t, midi: v.midi });
					firedCount += 1;
				}
				if (drift > 0 && Math.random() < drift) stepVoice(v, Math.random() < 0.5 ? -1 : 1);
				t += v.period;
			}
			nextFire.set(v.id, t);
		}
		if (events.length > 400) events = events.slice(-300);
	}

	async function toggleRun() {
		if (!running) {
			ensureAudio();
			await ctx!.resume();
			running = true;
		} else {
			running = false;
			await ctx?.suspend();
		}
	}

	function rephase() {
		nextFire.clear();
		events = [];
	}

	function onPeriodInput(v: Voice) {
		// Don't leave a shortened loop waiting out its old, longer schedule.
		if (!ctx) return;
		const nf = nextFire.get(v.id);
		if (nf !== undefined && nf > ctx.currentTime + v.period) {
			nextFire.set(v.id, ctx.currentTime + Math.random() * v.period);
		}
	}

	function addVoice() {
		if (voices.length >= 12) return;
		const notes = scaleNotes;
		voices.push({
			id: nextId++,
			midi: notes[Math.floor(Math.random() * notes.length)],
			period: +(10 + Math.random() * 26).toFixed(1),
			muted: false
		});
	}

	function removeVoice(id: number) {
		if (voices.length <= 1) return;
		voices = voices.filter((v) => v.id !== id);
		nextFire.delete(id);
	}

	$effect(() => {
		if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
	});

	// The clock: a timer, not requestAnimationFrame, so the piece keeps playing
	// when the tab is in the background.
	$effect(() => {
		if (!running) return;
		schedulerTick();
		const id = setInterval(schedulerTick, 450);
		return () => clearInterval(id);
	});

	$effect(() => {
		if (!running) return;
		const id = setInterval(() => {
			now = ctx ? ctx.currentTime : 0;
			draw();
		}, 120);
		return () => clearInterval(id);
	});

	// ---- Drawing -------------------------------------------------------------

	let canvas: HTMLCanvasElement | undefined = $state();
	let colours = { live: '#ffffff', dim: '#999999', bg: '#0a0a0a', grid: '#141414' };

	function readColours() {
		const cs = getComputedStyle(document.documentElement);
		const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
		colours = {
			live: v('--color-bright', '#ffffff'),
			dim: v('--color-muted', '#999999'),
			bg: v('--color-ink', '#0a0a0a'),
			grid: v('--color-dark', '#141414')
		};
	}

	function draw() {
		if (!canvas) return;
		const g = canvas.getContext('2d');
		if (!g) return;
		const dpr = window.devicePixelRatio || 1;
		const w = canvas.clientWidth;
		const h = 150;
		if (canvas.width !== Math.floor(w * dpr) || canvas.height !== h * dpr) {
			canvas.width = Math.floor(w * dpr);
			canvas.height = h * dpr;
		}
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.fillStyle = colours.bg;
		g.fillRect(0, 0, w, h);
		// Faint line per allowed note, so the scale is visible as a lattice.
		g.strokeStyle = colours.grid;
		g.lineWidth = 1;
		g.beginPath();
		for (const n of scaleNotes) {
			const y = h - ((n - LOW) / (HIGH - LOW)) * (h - 16) - 8;
			g.moveTo(0, y + 0.5);
			g.lineTo(w, y + 0.5);
		}
		g.stroke();
		const PX = 12; // pixels per second, right edge = now
		for (const e of events) {
			const age = now - e.t;
			if (age > w / PX) continue;
			const x = w - age * PX;
			if (x < 0 || x > w) continue;
			const y = h - ((e.midi - LOW) / (HIGH - LOW)) * (h - 16) - 8;
			g.globalAlpha = age < 0 ? 0.25 : Math.max(0.08, 1 - age / 14);
			g.fillStyle = colours.live;
			g.beginPath();
			g.arc(x, y, 3.2, 0, Math.PI * 2);
			g.fill();
		}
		g.globalAlpha = 1;
	}

	onMount(() => {
		readColours();
		draw();
		const themeWatch = new MutationObserver(() => {
			readColours();
			draw();
		});
		themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => {
			themeWatch.disconnect();
			ctx?.close();
		};
	});

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
	<title>Loops · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 sm:px-6">
	<header class="pt-12 pb-6">
		<a href={backHref} class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; {backLabel}</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Loops</h1>
		<p class="mt-3 max-w-2xl font-serif text-base leading-relaxed text-gray">
			A handful of voices, one note each, loop lengths that never divide evenly. The table below is
			the entire score, after Brian Eno&rsquo;s <em>2/1</em>, in the lineage of SSEYO&rsquo;s Koan.
			The composer writes the system; the system plays the piece.
		</p>
	</header>

	<!-- Transport -->
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			onclick={toggleRun}
			class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
		>
			{running ? 'Pause' : 'Run'}
		</button>
		<button
			type="button"
			onclick={rephase}
			class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
			>Rephase</button
		>
		<label class="ml-2 flex items-center gap-2">
			<span class="text-[10px] tracking-widest text-muted uppercase">Volume</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				bind:value={volume}
				class="w-24 text-light accent-current"
				aria-label="Master volume"
			/>
		</label>
		<span class="ml-auto font-mono text-xs text-muted tabular-nums">
			{firedCount} notes played
		</span>
	</div>

	<p class="mt-4 font-serif text-base text-light">
		This table lines up again <span class="text-bright">{repeatText}</span>.
	</p>

	<!-- Score view -->
	<div class="mt-4 overflow-hidden rounded border border-rule">
		<canvas bind:this={canvas} class="block h-[150px] w-full" aria-label="Recently played notes"
		></canvas>
	</div>

	<!-- The score itself -->
	<div class="mt-6 border-t border-rule pt-5">
		<div class="flex items-baseline justify-between">
			<p class="text-[10px] tracking-widest text-muted uppercase">The score</p>
			<button
				type="button"
				onclick={addVoice}
				disabled={voices.length >= 12}
				class="text-[10px] tracking-widest text-muted uppercase transition-colors hover:text-white disabled:opacity-30"
				>+ Add voice</button
			>
		</div>
		<div class="mt-3 divide-y divide-rule border-y border-rule">
			{#each voices as v (v.id)}
				{@const nf = nextFire.get(v.id)}
				{@const frac =
					running && nf !== undefined && nf >= now
						? Math.max(0, Math.min(1, 1 - (nf - now) / v.period))
						: 0}
				<div class="flex flex-wrap items-end gap-x-4 gap-y-2 py-3">
					<span class="flex flex-col gap-1">
						<span class="text-[9px] tracking-widest text-muted/70 uppercase">Note</span>
						<span class="flex items-center gap-1.5">
							<button
								type="button"
								onclick={() => stepVoice(v, -1)}
								class="h-6 w-6 rounded border border-rule text-xs text-muted transition-colors hover:text-bright"
								aria-label="Lower pitch">&minus;</button
							>
							<span class="w-8 text-center font-mono text-sm text-light tabular-nums"
								>{noteName(v.midi)}</span
							>
							<button
								type="button"
								onclick={() => stepVoice(v, 1)}
								class="h-6 w-6 rounded border border-rule text-xs text-muted transition-colors hover:text-bright"
								aria-label="Raise pitch">+</button
							>
						</span>
					</span>
					<span class="flex min-w-44 flex-1 flex-col gap-1">
						<span class="text-[9px] tracking-widest text-muted/70 uppercase">
							Loop length · <span class="text-light"
								>{v.period.toFixed(1)} seconds between notes</span
							>
						</span>
						<span class="relative flex items-center">
							<input
								type="range"
								min="4"
								max="45"
								step="0.1"
								bind:value={v.period}
								oninput={() => onPeriodInput(v)}
								class="w-full text-muted accent-current"
								aria-label="Loop length for {noteName(v.midi)}, seconds between notes"
							/>
							<span
								class="pointer-events-none absolute right-0 -bottom-1 h-px bg-bright transition-[width] duration-150"
								style="width: {frac * 100}%"
							></span>
						</span>
					</span>
					<span class="flex items-center gap-1.5 pb-0.5">
						<button
							type="button"
							onclick={() => (v.muted = !v.muted)}
							class="rounded border px-2 py-1 text-[10px] tracking-widest uppercase transition-colors {v.muted
								? 'border-rule text-muted'
								: 'border-muted text-light'}"
							aria-pressed={!v.muted}>{v.muted ? 'Off' : 'On'}</button
						>
						<button
							type="button"
							onclick={() => removeVoice(v.id)}
							disabled={voices.length <= 1}
							class="h-6 w-6 rounded border border-rule text-xs text-muted transition-colors hover:text-bright disabled:opacity-30"
							aria-label="Remove voice">&times;</button
						>
					</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- The decisions -->
	<section class="mt-6 grid gap-6 border-t border-rule pt-6 sm:grid-cols-3">
		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">What a voice may sing</p>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each Object.keys(SCALES) as name (name)}
					<button
						type="button"
						onclick={() => (scaleName = name)}
						class="rounded border px-2.5 py-1.5 text-xs transition-colors {scaleName === name
							? 'border-bright text-bright'
							: 'border-rule text-muted hover:text-light'}">{name}</button
					>
				{/each}
			</div>
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each NAMES as n, pc (n)}
					<button
						type="button"
						onclick={() => (rootPc = pc)}
						class="h-7 w-8 rounded border font-mono text-xs transition-colors {rootPc === pc
							? 'border-bright text-bright'
							: 'border-rule text-muted hover:text-light'}"
						aria-pressed={rootPc === pc}>{n}</button
					>
				{/each}
			</div>
			<p class="mt-3 font-serif text-sm leading-relaxed text-muted">
				Change the scale and every voice snaps to the nearest note it is still allowed. The grid
				underneath (twelve equal steps, A at 440) was decided long before this page.
			</p>
		</div>

		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">Whether it evolves</p>
			<div class="mt-3 flex gap-2">
				{#each [{ label: 'Never', p: 0 }, { label: 'Rarely', p: 0.04 }, { label: 'Often', p: 0.18 }] as opt (opt.label)}
					<button
						type="button"
						onclick={() => (drift = opt.p)}
						class="rounded border px-3 py-1.5 text-xs transition-colors {drift === opt.p
							? 'border-bright text-bright'
							: 'border-rule text-muted hover:text-light'}">{opt.label}</button
					>
				{/each}
			</div>
			<p class="mt-3 font-serif text-sm leading-relaxed text-muted">
				Drift lets a voice step to a neighbouring scale tone when it fires. Even
				&ldquo;rarely&rdquo; destroys the repeat time above: a system that re-decides anything never
				returns to its starting state.
			</p>
		</div>

		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">What a note even is</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => (timbre = 'sine')}
					class="rounded border px-3 py-1.5 text-xs transition-colors {timbre === 'sine'
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Pure</button
				>
				<button
					type="button"
					onclick={() => (timbre = 'triangle')}
					class="rounded border px-3 py-1.5 text-xs transition-colors {timbre === 'triangle'
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Reed</button
				>
				<button
					type="button"
					onclick={() => (envelope = 'swell')}
					class="rounded border px-3 py-1.5 text-xs transition-colors {envelope === 'swell'
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Swell</button
				>
				<button
					type="button"
					onclick={() => (envelope = 'struck')}
					class="rounded border px-3 py-1.5 text-xs transition-colors {envelope === 'struck'
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Struck</button
				>
			</div>
			<p class="mt-3 font-serif text-sm leading-relaxed text-muted">
				A note here is an onset with an envelope and a fixed room around it: the delay, its
				feedback, its filter are not controls. Somebody decided you would not need them.
			</p>
		</div>
	</section>

	<!-- Why -->
	<section class="prose mt-12 pb-24">
		<h2>The composer ships the system</h2>
		<p>
			In 1978 Eno made <em>2/1</em> from tape loops of single sung notes, each loop a different
			length, left to run: because the lengths share no convenient divisor, the combination drifts
			out of and back into alignment on a cycle longer than anyone will listen. In 1996 he released
			<em>Generative Music 1</em> on floppy disk: software, not audio, running on SSEYO&rsquo;s Koan engine,
			which survives today as Wotja. The piece was a set of constraints; every playback an original.
		</p>
		<p>
			The table above is the same object. Its output is endless, but everything about it was decided
			in advance: which twelve pitches exist, which of them are permitted, how a note swells and
			dies, how the room echoes. When the repeat time reads in centuries, that is not the system
			being creative. It is arithmetic on the loop lengths, which you set.
		</p>
		<p><a href="/lab/1">Back to Lab 01</a>.</p>
	</section>
</div>
