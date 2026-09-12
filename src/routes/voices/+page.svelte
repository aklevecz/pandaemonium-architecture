<script lang="ts">
	import { page } from '$app/state';
	// The Koan move, rebuilt small. Where /loops plays fixed notes on fixed
	// periods, a voice here CHOOSES each note as it goes — pitch sampled from
	// weights shaped by rules the composer authors: register, motion, harmony,
	// temperature. The dice panel shows every roll, because the point of the
	// page is that there are dice, and that somebody loaded them.
	import { onMount } from 'svelte';

	type Register = 'low' | 'mid' | 'high';
	type Motion = 'still' | 'steps' | 'leaps';
	type Length = 'short' | 'medium' | 'long';

	interface Voice {
		id: number;
		register: Register;
		motion: Motion;
		length: Length;
		density: number; // events per minute
		muted: boolean;
		current: number; // midi of the last chosen note
	}

	const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
	const LOW = 36; // C2
	const HIGH = 84; // C6
	const LOOKAHEAD = 2.6;

	const REGISTERS: Record<Register, [number, number]> = {
		low: [36, 55],
		mid: [55, 72],
		high: [69, 84]
	};
	// Widths (in scale steps) of the gaussian that weights movement away from
	// the current note. Leaps adds a bump around a fifth-ish jump.
	const MOTION_SIGMA: Record<Motion, number> = { still: 1.2, steps: 2.5, leaps: 6 };
	const LENGTHS: Record<Length, { att: number; rel: number; label: string }> = {
		short: { att: 0.02, rel: 1.2, label: 'Short' },
		medium: { att: 0.4, rel: 3.2, label: 'Medium' },
		long: { att: 1.3, rel: 6.5, label: 'Long' }
	};

	const SCALES: Record<string, number[]> = {
		Major: [0, 2, 4, 5, 7, 9, 11],
		'Major pentatonic': [0, 2, 4, 7, 9],
		Dorian: [0, 2, 3, 5, 7, 10],
		'Whole-tone': [0, 2, 4, 6, 8, 10],
		Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
	};

	let rootPc = $state(1); // Db
	let scaleName = $state('Major');
	let temperature = $state(1); // 0.4 cold · 1 warm · 2.5 hot
	let harmony = $state(true);
	let volume = $state(0.8);

	let voices = $state<Voice[]>([
		{
			id: 1,
			register: 'low',
			motion: 'still',
			length: 'long',
			density: 4,
			muted: false,
			current: 46
		},
		{
			id: 2,
			register: 'mid',
			motion: 'steps',
			length: 'medium',
			density: 10,
			muted: false,
			current: 63
		},
		{
			id: 3,
			register: 'high',
			motion: 'leaps',
			length: 'short',
			density: 7,
			muted: false,
			current: 75
		}
	]);
	let nextId = 4;

	let running = $state(false);
	let now = $state(0);
	let firedCount = $state(0);

	// Last roll of the dice, for the panel.
	let lastChoice = $state<{
		label: string;
		candidates: { midi: number; w: number; chosen: boolean }[];
	} | null>(null);

	// Chord walk: a degree of the scale, re-decided every ~15s when harmony is
	// on. Voices' weights lean toward its triad; nobody conducts.
	let chordDegree = $state(0);
	const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];

	const scaleNotes = $derived.by(() => {
		const iv = SCALES[scaleName];
		const out: number[] = [];
		for (let m = LOW; m <= HIGH; m++) if (iv.includes((m - rootPc + 120) % 12)) out.push(m);
		return out;
	});

	const chordPcs = $derived.by(() => {
		const iv = SCALES[scaleName];
		const deg = (n: number) => (rootPc + iv[(chordDegree + n) % iv.length]) % 12;
		return [deg(0), deg(2), deg(4)];
	});

	function noteName(m: number) {
		return NAMES[m % 12] + (Math.floor(m / 12) - 1);
	}

	function voiceLabel(v: Voice) {
		return v.register[0].toUpperCase() + v.register.slice(1) + ' ' + v.id;
	}

	// ---- The dice ------------------------------------------------------------

	function choosePitch(v: Voice): number {
		const [lo, hi] = REGISTERS[v.register];
		const candidates = scaleNotes.filter((m) => m >= lo && m <= hi);
		if (candidates.length === 0) return v.current;
		const sigma = MOTION_SIGMA[v.motion];
		const curIdx = candidates.reduce(
			(best, m, i) => (Math.abs(m - v.current) < Math.abs(candidates[best] - v.current) ? i : best),
			0
		);
		let weights = candidates.map((m, i) => {
			const d = Math.abs(i - curIdx); // distance in scale steps
			let w = Math.exp(-((d / sigma) ** 2));
			if (v.motion === 'leaps') w += 0.35 * Math.exp(-(((d - 5) / 2) ** 2));
			if (harmony && chordPcs.includes(m % 12)) w *= 3;
			return w + 0.02;
		});
		// Temperature: the same knob as an LLM sampler. Cold sharpens toward
		// the argmax; hot flattens toward the whole scale.
		weights = weights.map((w) => w ** (1 / temperature));
		const total = weights.reduce((a, b) => a + b, 0);
		let r = Math.random() * total;
		let pick = candidates.length - 1;
		for (let i = 0; i < weights.length; i++) {
			r -= weights[i];
			if (r <= 0) {
				pick = i;
				break;
			}
		}
		lastChoice = {
			label: voiceLabel(v),
			candidates: candidates.map((m, i) => ({
				midi: m,
				w: weights[i] / total,
				chosen: i === pick
			}))
		};
		return candidates[pick];
	}

	// ---- Audio ---------------------------------------------------------------

	let ctx: AudioContext | null = null;
	let master: GainNode | null = null;
	let send: GainNode | null = null;
	const nextFire = new Map<number, number>();
	let chordNext = 0;
	let events: { t: number; midi: number }[] = [];

	function ensureAudio() {
		if (ctx) return;
		ctx = new AudioContext();
		master = ctx.createGain();
		master.gain.value = volume;
		master.connect(ctx.destination);
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

	function playNote(v: Voice, midi: number, t: number) {
		if (!ctx || !master || !send) return;
		const { att, rel } = LENGTHS[v.length];
		const live = Math.max(1, voices.filter((x) => !x.muted).length);
		const peak = (0.16 / Math.sqrt(live)) * (0.85 + Math.random() * 0.3);
		const f = 440 * 2 ** ((midi - 69) / 12);
		const g = ctx.createGain();
		g.connect(master);
		g.connect(send);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(peak, t + att);
		g.gain.exponentialRampToValueAtTime(0.0008, t + att + rel);
		g.gain.linearRampToValueAtTime(0, t + att + rel + 0.08);
		for (const d of [-3.5, 3.5]) {
			const o = ctx.createOscillator();
			o.type = v.register === 'low' ? 'sine' : 'triangle';
			o.frequency.value = f;
			o.detune.value = d;
			o.connect(g);
			o.start(t);
			o.stop(t + att + rel + 0.15);
		}
	}

	function meanGap(v: Voice) {
		return 60 / Math.max(1, v.density);
	}

	function schedulerTick() {
		if (!ctx) return;
		const horizon = ctx.currentTime + LOOKAHEAD;
		if (harmony && ctx.currentTime >= chordNext) {
			// Lean on the primary triads; visit the others sometimes.
			const degrees = [0, 3, 4, 0, 3, 4, 1, 5];
			chordDegree = degrees[Math.floor(Math.random() * degrees.length)];
			chordNext = ctx.currentTime + 12 + Math.random() * 8;
		}
		for (const v of voices) {
			let t = nextFire.get(v.id) ?? ctx.currentTime + 0.2 + Math.random() * meanGap(v);
			while (t < horizon) {
				if (!v.muted) {
					const midi = choosePitch(v);
					v.current = midi;
					playNote(v, midi, Math.max(t, ctx.currentTime + 0.03));
					events.push({ t, midi });
					firedCount += 1;
				}
				t += meanGap(v) * (0.4 + Math.random() * 1.2);
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

	function cycle<T extends string>(list: T[], cur: T): T {
		return list[(list.indexOf(cur) + 1) % list.length];
	}

	function addVoice() {
		if (voices.length >= 8) return;
		const register: Register = (['low', 'mid', 'high'] as Register[])[
			Math.floor(Math.random() * 3)
		];
		const [lo, hi] = REGISTERS[register];
		voices.push({
			id: nextId++,
			register,
			motion: 'steps',
			length: 'medium',
			density: 6 + Math.floor(Math.random() * 10),
			muted: false,
			current: Math.floor((lo + hi) / 2)
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
		g.strokeStyle = colours.grid;
		g.lineWidth = 1;
		g.beginPath();
		for (const n of scaleNotes) {
			const y = h - ((n - LOW) / (HIGH - LOW)) * (h - 16) - 8;
			g.moveTo(0, y + 0.5);
			g.lineTo(w, y + 0.5);
		}
		g.stroke();
		const PX = 12;
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
	<title>Voices · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 sm:px-6">
	<header class="pt-12 pb-6">
		<a href={backHref} class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; {backLabel}</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Voices</h1>
		<p class="mt-3 max-w-2xl font-serif text-base leading-relaxed text-gray">
			Where <a href="/loops" class="underline decoration-rule underline-offset-2 hover:text-bright"
				>Loops</a
			>
			plays fixed notes on fixed periods, a voice here chooses every note as it goes, by rolling dice
			you have loaded. This is the move SSEYO&rsquo;s Koan made in 1994, and the engine line that became
			Wotja. The panel below shows each roll.
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
		{#if harmony}
			<span class="ml-2 font-mono text-xs text-muted tabular-nums">
				chord: <span class="text-light">{ROMAN[chordDegree] ?? 'I'}</span>
			</span>
		{/if}
		<span class="ml-auto font-mono text-xs text-muted tabular-nums">
			{firedCount} notes chosen
		</span>
	</div>

	<!-- Score view -->
	<div class="mt-4 overflow-hidden rounded border border-rule">
		<canvas bind:this={canvas} class="block h-[150px] w-full" aria-label="Recently chosen notes"
		></canvas>
	</div>

	<!-- The dice -->
	<div class="mt-4 rounded border border-rule p-4">
		<div class="flex items-baseline justify-between">
			<p class="text-[10px] tracking-widest text-muted uppercase">The dice</p>
			{#if lastChoice}
				<p class="font-mono text-xs text-muted tabular-nums">
					{lastChoice.label} chose
					<span class="text-bright"
						>{noteName(lastChoice.candidates.find((c) => c.chosen)?.midi ?? 0)}</span
					>
				</p>
			{/if}
		</div>
		{#if lastChoice}
			<div class="mt-3 flex h-16 items-end gap-1">
				{#each lastChoice.candidates as c (c.midi)}
					<div class="flex min-w-0 flex-1 flex-col items-center gap-1">
						<div
							class="w-full rounded-t-xs {c.chosen ? 'bg-bright' : 'bg-rule'}"
							style="height: {Math.max(2, c.w * 100 * 2.2)}%"
						></div>
						<span
							class="hidden font-mono text-[9px] tabular-nums sm:block {c.chosen
								? 'text-bright'
								: 'text-muted/60'}">{noteName(c.midi)}</span
						>
					</div>
				{/each}
			</div>
			<p class="mt-2 font-serif text-xs text-muted">
				Bar height is the probability each allowed note had at the moment of the roll, after
				register, motion, harmony and temperature had their say.
			</p>
		{:else}
			<p class="mt-3 font-serif text-sm text-muted">Press run. Every note will show its odds.</p>
		{/if}
	</div>

	<!-- The voices -->
	<div class="mt-6 border-t border-rule pt-5">
		<div class="flex items-baseline justify-between">
			<p class="text-[10px] tracking-widest text-muted uppercase">The voices</p>
			<button
				type="button"
				onclick={addVoice}
				disabled={voices.length >= 8}
				class="text-[10px] tracking-widest text-muted uppercase transition-colors hover:text-white disabled:opacity-30"
				>+ Add voice</button
			>
		</div>
		<div class="mt-3 divide-y divide-rule border-y border-rule">
			{#each voices as v (v.id)}
				<div class="flex flex-wrap items-end gap-x-4 gap-y-2 py-3">
					<span class="w-14 pb-1 font-mono text-sm text-light">{voiceLabel(v)}</span>
					<span class="flex flex-col gap-1">
						<span class="text-[9px] tracking-widest text-muted/70 uppercase">Register</span>
						<button
							type="button"
							title="Click to change"
							onclick={() => (v.register = cycle(['low', 'mid', 'high'], v.register))}
							class="rounded border border-rule px-2.5 py-1 text-[10px] tracking-widest text-light uppercase transition-colors hover:border-muted hover:text-bright"
							>{v.register}</button
						>
					</span>
					<span class="flex flex-col gap-1">
						<span class="text-[9px] tracking-widest text-muted/70 uppercase">Movement</span>
						<button
							type="button"
							title="Click to change"
							onclick={() => (v.motion = cycle(['still', 'steps', 'leaps'], v.motion))}
							class="rounded border border-rule px-2.5 py-1 text-[10px] tracking-widest text-light uppercase transition-colors hover:border-muted hover:text-bright"
							>{v.motion}</button
						>
					</span>
					<span class="flex flex-col gap-1">
						<span class="text-[9px] tracking-widest text-muted/70 uppercase">Note length</span>
						<button
							type="button"
							title="Click to change"
							onclick={() => (v.length = cycle(['short', 'medium', 'long'], v.length))}
							class="rounded border border-rule px-2.5 py-1 text-[10px] tracking-widest text-light uppercase transition-colors hover:border-muted hover:text-bright"
							>{LENGTHS[v.length].label}</button
						>
					</span>
					<span class="flex min-w-44 flex-1 flex-col gap-1">
						<span class="text-[9px] tracking-widest text-muted/70 uppercase">
							How often it sings · <span class="text-light">~{v.density} a minute</span>
						</span>
						<input
							type="range"
							min="2"
							max="40"
							step="1"
							bind:value={v.density}
							class="w-full text-muted accent-current"
							aria-label="How often {voiceLabel(v)} sings, notes per minute"
						/>
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

	<!-- The rules -->
	<section class="mt-6 grid gap-6 border-t border-rule pt-6 sm:grid-cols-3">
		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">The allowed notes</p>
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
				No voice can sing a note outside this set. The rule is absolute and silent. Nothing in the
				output announces it.
			</p>
		</div>

		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">Harmony</p>
			<div class="mt-3 flex gap-2">
				<button
					type="button"
					onclick={() => (harmony = false)}
					class="rounded border px-3 py-1.5 text-xs transition-colors {!harmony
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Free</button
				>
				<button
					type="button"
					onclick={() => (harmony = true)}
					class="rounded border px-3 py-1.5 text-xs transition-colors {harmony
						? 'border-bright text-bright'
						: 'border-rule text-muted hover:text-light'}">Chords</button
				>
			</div>
			<p class="mt-3 font-serif text-sm leading-relaxed text-muted">
				With chords on, a triad drifts every fifteen seconds or so and every voice&rsquo;s dice lean
				toward it: three independent voices agreeing without a conductor. Watch the chord numeral by
				the transport.
			</p>
		</div>

		<div>
			<p class="text-[10px] tracking-widest text-muted uppercase">Temperature</p>
			<div class="mt-3 flex gap-2">
				{#each [{ label: 'Cold', t: 0.4 }, { label: 'Warm', t: 1 }, { label: 'Hot', t: 2.5 }] as opt (opt.label)}
					<button
						type="button"
						onclick={() => (temperature = opt.t)}
						class="rounded border px-3 py-1.5 text-xs transition-colors {temperature === opt.t
							? 'border-bright text-bright'
							: 'border-rule text-muted hover:text-light'}">{opt.label}</button
					>
				{/each}
			</div>
			<p class="mt-3 font-serif text-sm leading-relaxed text-muted">
				Cold sharpens the dice toward the single likeliest note; hot flattens them toward the whole
				scale.
			</p>
		</div>
	</section>

	<!-- Why -->
	<section class="prose mt-12 pb-24">
		<h2>Rules, then dice</h2>
		<p>
			Koan&rsquo;s premise was that a piece of music could be a set of tendencies: a voice knows its
			register, how far it likes to move, how often it sings, what harmony it leans toward, and
			everything else is decided at playback, by weighted chance. Eno&rsquo;s
			<em>Generative Music 1</em> shipped on exactly that engine. The composer&rsquo;s work moved one
			level up: not choosing the notes, but loading the dice that choose the notes.
		</p>
		<p>
			The panel above makes the loading visible. Every bar chart is a probability distribution that
			existed for a moment before a note was drawn from it, authored by four rules you can point at.
		</p>
		<p>
			<a href="/loops">Loops</a> is this page with the dice removed; Wotja is this page with thirty
			years of engine added. <a href="/lab/1">Back to Lab 01</a>.
		</p>
	</section>
</div>
