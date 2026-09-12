<script lang="ts">
	// Diffusion on a training set you can see. Images are 64x64 greyscale. The
	// forward process adds gaussian noise on a cosine schedule. The denoiser is
	// the exact optimal one for a finite training set: a weighted average of
	// the training images, each weighted by how likely it is to have produced
	// the noisy input. The reverse process runs that denoiser from pure noise
	// with DDIM steps, so a seed always gives the same image.
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	const N = 64;
	const DIM = N * N;
	const MAX_SET = 12;

	type Img = Float32Array;

	// ---- state ---------------------------------------------------------------
	let dataset = $state.raw<Img[]>([]);
	let selected = $state(0);
	let t = $state(0.5); // forward noise level, 0 clean .. 1 pure noise
	let forwardSeed = $state(7);
	let seed = $state(1);
	let steps = $state(25);
	// 0 = DDIM (deterministic), 1 = DDPM (fresh noise each step)
	let eta = $state(0);
	let running = $state(false);
	let gen = $state.raw<{ x: Img; w: number[]; step: number } | null>(null);
	let paletteTick = $state(0);

	// ---- schedule and noise --------------------------------------------------
	function alphaBar(tt: number) {
		const a = Math.cos((tt * Math.PI) / 2) ** 2;
		return Math.min(1 - 1e-4, Math.max(1e-4, a));
	}

	function rng(s: number) {
		let a = s >>> 0 || 1;
		return () => {
			a += 0x6d2b79f5;
			let z = a;
			z = Math.imul(z ^ (z >>> 15), z | 1);
			z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
			return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
		};
	}

	function gaussian(s: number): Img {
		const r = rng(s);
		const out = new Float32Array(DIM);
		for (let i = 0; i < DIM; i += 2) {
			const u = Math.max(r(), 1e-12);
			const v = r();
			const m = Math.sqrt(-2 * Math.log(u));
			out[i] = m * Math.cos(2 * Math.PI * v);
			if (i + 1 < DIM) out[i + 1] = m * Math.sin(2 * Math.PI * v);
		}
		return out;
	}

	function noisy(x0: Img, ab: number, eps: Img): Img {
		const sa = Math.sqrt(ab);
		const sb = Math.sqrt(1 - ab);
		const out = new Float32Array(DIM);
		for (let i = 0; i < DIM; i++) out[i] = sa * x0[i] + sb * eps[i];
		return out;
	}

	// The optimal denoiser for a finite training set: posterior mean over the
	// set given the noisy input at this noise level.
	function estimate(xt: Img, ab: number): { x0: Img; w: number[] } {
		const sa = Math.sqrt(ab);
		const varr = 1 - ab;
		const logits = dataset.map((xi) => {
			let d = 0;
			for (let k = 0; k < DIM; k++) {
				const e = xt[k] - sa * xi[k];
				d += e * e;
			}
			return -d / (2 * varr);
		});
		const m = Math.max(...logits);
		const ex = logits.map((l) => Math.exp(l - m));
		const z = ex.reduce((a, b) => a + b, 0);
		const w = ex.map((e) => e / z);
		const x0 = new Float32Array(DIM);
		dataset.forEach((xi, i) => {
			for (let k = 0; k < DIM; k++) x0[k] += w[i] * xi[k];
		});
		return { x0, w };
	}

	// ---- reverse process -----------------------------------------------------
	let timer: ReturnType<typeof setInterval> | null = null;

	function generate() {
		if (timer) clearInterval(timer);
		if (dataset.length === 0) return;
		const ts: number[] = [];
		for (let k = 0; k <= steps; k++) ts.push(1 - k / steps);
		let x = gaussian(seed);
		const fresh = rng(seed ^ 0x9e3779b9);
		const gauss1 = () => {
			const u = Math.max(fresh(), 1e-12);
			const v = fresh();
			return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
		};
		let k = 0;
		running = true;
		const first = estimate(x, alphaBar(ts[0]));
		gen = { x, w: first.w, step: 0 };
		timer = setInterval(() => {
			const tt = ts[k];
			const tn = ts[k + 1];
			const ab = alphaBar(tt);
			const abn = alphaBar(tn);
			const { x0, w } = estimate(x, ab);
			const sa = Math.sqrt(ab);
			const sb = Math.sqrt(1 - ab);
			const san = Math.sqrt(abn);
			// DDIM variance: sigma = eta * sqrt((1-abn)/(1-ab)) * sqrt(1 - ab/abn)
			const sigma = tn === 0 ? 0 : eta * Math.sqrt(((1 - abn) / (1 - ab)) * (1 - ab / abn));
			const sbn = Math.sqrt(Math.max(0, 1 - abn - sigma * sigma));
			const next = new Float32Array(DIM);
			for (let i = 0; i < DIM; i++) {
				const eps = (x[i] - sa * x0[i]) / sb;
				next[i] = tn === 0 ? x0[i] : san * x0[i] + sbn * eps + (sigma > 0 ? sigma * gauss1() : 0);
			}
			x = next;
			k += 1;
			gen = { x, w, step: k };
			if (k >= steps) {
				if (timer) clearInterval(timer);
				timer = null;
				running = false;
			}
		}, 100);
	}

	// ---- images in, arrays out -------------------------------------------------
	function imageToArray(im: CanvasImageSource, w: number, h: number): Img {
		const cv = document.createElement('canvas');
		cv.width = N;
		cv.height = N;
		const c = cv.getContext('2d')!;
		const sc = Math.max(N / w, N / h);
		const dw = w * sc;
		const dh = h * sc;
		c.drawImage(im, (N - dw) / 2, (N - dh) / 2, dw, dh);
		const d = c.getImageData(0, 0, N, N).data;
		const out = new Float32Array(DIM);
		for (let i = 0; i < DIM; i++) {
			const lum = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
			out[i] = (lum / 255) * 2 - 1;
		}
		return out;
	}

	// Ten outputs from a Stable Diffusion XL finetune of Ariel's, shipped as small greyscale PNGs.
	const BUILTIN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `/denoise/${n}.png`);

	async function loadBuiltins(): Promise<Img[]> {
		return Promise.all(
			BUILTIN.map(
				(src) =>
					new Promise<Img>((resolve, reject) => {
						// onload rather than decode(): decode() can stall while the tab
						// is in the background.
						const im = new Image();
						im.onload = () => resolve(imageToArray(im, im.naturalWidth, im.naturalHeight));
						im.onerror = () => reject(new Error(`could not load ${src}`));
						im.src = src;
					})
			)
		);
	}

	async function addFiles(files: FileList | null) {
		if (!files) return;
		const added: Img[] = [];
		for (const f of Array.from(files)) {
			if (dataset.length + added.length >= MAX_SET) break;
			try {
				const bm = await createImageBitmap(f);
				added.push(imageToArray(bm, bm.width, bm.height));
				bm.close();
			} catch {
				// not an image the browser can decode; skip it
			}
		}
		if (added.length) dataset = [...dataset, ...added];
	}

	// Fallback if the photographs fail to load: simple glyphs.
	function glyph(draw: (c: CanvasRenderingContext2D) => void): Img {
		const cv = document.createElement('canvas');
		cv.width = N;
		cv.height = N;
		const c = cv.getContext('2d')!;
		c.fillStyle = '#000';
		c.fillRect(0, 0, N, N);
		c.fillStyle = '#fff';
		c.strokeStyle = '#fff';
		c.lineWidth = 3;
		c.lineCap = 'round';
		c.scale(N / 32, N / 32);
		draw(c);
		const d = c.getImageData(0, 0, N, N).data;
		const out = new Float32Array(DIM);
		for (let i = 0; i < DIM; i++) out[i] = (d[i * 4] / 255) * 2 - 1;
		return out;
	}

	function builtins(): Img[] {
		return [
			glyph((c) => {
				c.beginPath();
				c.arc(16, 16, 10, 0, Math.PI * 2);
				c.stroke();
			}),
			glyph((c) => c.fillRect(9, 9, 14, 14)),
			glyph((c) => {
				c.beginPath();
				c.moveTo(16, 5);
				c.lineTo(27, 26);
				c.lineTo(5, 26);
				c.closePath();
				c.stroke();
			}),
			glyph((c) => {
				c.beginPath();
				c.moveTo(7, 7);
				c.lineTo(25, 25);
				c.moveTo(25, 7);
				c.lineTo(7, 25);
				c.stroke();
			}),
			glyph((c) => c.fillRect(4, 13, 24, 6)),
			glyph((c) => {
				c.beginPath();
				c.arc(16, 16, 11, 0, Math.PI * 2);
				c.arc(16, 16, 5, 0, Math.PI * 2, true);
				c.fill('evenodd');
			})
		];
	}

	// ---- drawing pad -------------------------------------------------------------
	let pad = $state.raw<Img>(new Float32Array(DIM).fill(-1));
	let padCanvas: HTMLCanvasElement | undefined = $state();
	let painting = false;

	function padCell(e: PointerEvent): [number, number] | null {
		if (!padCanvas) return null;
		const r = padCanvas.getBoundingClientRect();
		const x = ((e.clientX - r.left) / r.width) * N;
		const y = ((e.clientY - r.top) / r.height) * N;
		if (x < 0 || y < 0 || x >= N || y >= N) return null;
		return [x, y];
	}

	function paint(e: PointerEvent) {
		const c = padCell(e);
		if (!c) return;
		const [px, py] = c;
		const next = new Float32Array(pad);
		for (let y = 0; y < N; y++) {
			for (let x = 0; x < N; x++) {
				const d = Math.hypot(x + 0.5 - px, y + 0.5 - py) / (N / 32);
				if (d < 1.6) next[y * N + x] = Math.max(next[y * N + x], 1);
				else if (d < 2.3) next[y * N + x] = Math.max(next[y * N + x], 0.2);
			}
		}
		pad = next;
	}

	function addDrawing() {
		if (dataset.length >= MAX_SET) return;
		dataset = [...dataset, pad];
		pad = new Float32Array(DIM).fill(-1);
	}

	function removeImage(i: number) {
		if (dataset.length <= 1) return;
		dataset = dataset.filter((_, k) => k !== i);
		if (selected >= dataset.length) selected = dataset.length - 1;
	}

	// ---- rendering ---------------------------------------------------------------
	let bg = [10, 10, 10];
	let ink = [255, 255, 255];

	function hex(s: string): number[] | null {
		const m = s.trim().match(/^#([0-9a-f]{6})$/i);
		if (!m) return null;
		const n = parseInt(m[1], 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function readColours() {
		const cs = getComputedStyle(document.documentElement);
		bg = hex(cs.getPropertyValue('--color-ink')) ?? bg;
		ink = hex(cs.getPropertyValue('--color-bright')) ?? ink;
	}

	function draw(canvas: HTMLCanvasElement | undefined, img: Img | null) {
		if (!canvas) return;
		const c = canvas.getContext('2d');
		if (!c) return;
		if (canvas.width !== N) {
			canvas.width = N;
			canvas.height = N;
		}
		const id = c.createImageData(N, N);
		for (let i = 0; i < DIM; i++) {
			const v = img ? Math.max(-1, Math.min(1, img[i])) : -1;
			const m = (v + 1) / 2;
			id.data[i * 4] = bg[0] + (ink[0] - bg[0]) * m;
			id.data[i * 4 + 1] = bg[1] + (ink[1] - bg[1]) * m;
			id.data[i * 4 + 2] = bg[2] + (ink[2] - bg[2]) * m;
			id.data[i * 4 + 3] = 255;
		}
		c.putImageData(id, 0, 0);
	}

	let cleanCanvas: HTMLCanvasElement | undefined = $state();
	let noisyCanvas: HTMLCanvasElement | undefined = $state();
	let estCanvas: HTMLCanvasElement | undefined = $state();
	let genCanvas: HTMLCanvasElement | undefined = $state();
	let thumbs = $state.raw<(HTMLCanvasElement | undefined)[]>([]);

	const forwardEps = $derived(gaussian(forwardSeed));
	const ab = $derived(alphaBar(t));
	const forward = $derived.by(() => {
		paletteTick;
		if (dataset.length === 0) return null;
		const x0 = dataset[Math.min(selected, dataset.length - 1)];
		const xt = noisy(x0, ab, forwardEps);
		const { x0: est, w } = estimate(xt, ab);
		return { x0, xt, est, w };
	});

	$effect(() => {
		paletteTick;
		draw(cleanCanvas, forward?.x0 ?? null);
		draw(noisyCanvas, forward?.xt ?? null);
		draw(estCanvas, forward?.est ?? null);
	});

	$effect(() => {
		paletteTick;
		draw(genCanvas, gen?.x ?? null);
	});

	$effect(() => {
		paletteTick;
		draw(padCanvas, pad);
	});

	$effect(() => {
		paletteTick;
		dataset.forEach((img, i) => draw(thumbs[i], img));
	});

	onMount(() => {
		readColours();
		loadBuiltins()
			.then((imgs) => (dataset = imgs))
			.catch(() => (dataset = builtins()));
		const mo = new MutationObserver(() => {
			readColours();
			paletteTick += 1;
		});
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => {
			mo.disconnect();
			if (timer) clearInterval(timer);
		};
	});

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

	const btn =
		'rounded border border-rule px-3 py-1.5 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright disabled:opacity-30';
	const pick = (on: boolean) =>
		`rounded border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors ${on ? 'border-bright text-bright' : 'border-rule text-muted hover:text-light'}`;
</script>

<svelte:head>
	<title>Denoise · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 sm:px-6">
	<header class="pt-12 pb-6">
		<a href={backHref} class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; {backLabel}</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Denoise</h1>
		<p class="mt-3 max-w-2xl font-serif text-base leading-relaxed text-gray">
			A diffusion model on a training set small enough to see. Images are 64 by 64 greyscale. Noise
			is added on a schedule; a denoiser estimates the clean image from the noisy one; generation
			runs the denoiser from pure noise. The training set is ten images from a Stable Diffusion
			finetune Ariel made, plus anything you upload or draw.
		</p>
	</header>

	<!-- Training set -->
	<section class="border-t border-rule pt-5">
		<div class="flex items-baseline justify-between">
			<p class="text-[10px] tracking-widest text-muted uppercase">The training set</p>
			<p class="font-mono text-xs text-muted tabular-nums">{dataset.length} / {MAX_SET}</p>
		</div>
		<div class="mt-3 flex flex-wrap items-end gap-3">
			{#each dataset as img, i (i)}
				<div class="relative">
					<button
						type="button"
						onclick={() => (selected = i)}
						class="block rounded border p-0.5 transition-colors {selected === i
							? 'border-bright'
							: 'border-rule hover:border-muted'}"
						aria-label="Select training image {i + 1}"
					>
						<canvas bind:this={thumbs[i]} class="block h-14 w-14 [image-rendering:pixelated]"
						></canvas>
					</button>
					<button
						type="button"
						onclick={() => removeImage(i)}
						disabled={dataset.length <= 1}
						class="absolute -top-2 -right-2 h-5 w-5 rounded-full border border-rule bg-black text-[10px] text-muted transition-colors hover:text-bright disabled:opacity-0"
						aria-label="Remove training image {i + 1}">&times;</button
					>
				</div>
			{/each}

			<div class="ml-2 flex items-end gap-3 border-l border-rule pl-4">
				<div>
					<p class="mb-1.5 text-[10px] tracking-widest text-muted uppercase">Draw one</p>
					<canvas
						bind:this={padCanvas}
						onpointerdown={(e) => {
							painting = true;
							padCanvas?.setPointerCapture(e.pointerId);
							paint(e);
						}}
						onpointermove={(e) => painting && paint(e)}
						onpointerup={() => (painting = false)}
						onpointercancel={() => (painting = false)}
						class="block h-24 w-24 cursor-crosshair touch-none rounded border border-rule [image-rendering:pixelated]"
						aria-label="Drawing pad, 64 by 64"
					></canvas>
				</div>
				<div class="flex flex-col gap-1.5">
					<button
						type="button"
						onclick={addDrawing}
						disabled={dataset.length >= MAX_SET}
						class={btn}>Add to set</button
					>
					<button type="button" onclick={() => (pad = new Float32Array(DIM).fill(-1))} class={btn}
						>Clear</button
					>
					<label class="{btn} cursor-pointer text-center">
						Upload
						<input
							type="file"
							accept="image/*"
							multiple
							class="sr-only"
							disabled={dataset.length >= MAX_SET}
							onchange={(e) => addFiles((e.currentTarget as HTMLInputElement).files)}
						/>
					</label>
				</div>
			</div>
		</div>
	</section>

	<!-- Forward -->
	<section class="mt-8 border-t border-rule pt-5">
		<p class="text-[10px] tracking-widest text-muted uppercase">Forward: adding noise</p>
		<div class="mt-3 flex flex-wrap items-start gap-6">
			<div>
				<canvas
					bind:this={cleanCanvas}
					class="block h-40 w-40 rounded border border-rule [image-rendering:pixelated]"
				></canvas>
				<p class="mt-2 text-xs text-muted">clean image</p>
			</div>
			<div>
				<canvas
					bind:this={noisyCanvas}
					class="block h-40 w-40 rounded border border-rule [image-rendering:pixelated]"
				></canvas>
				<p class="mt-2 text-xs text-muted">
					with noise · <span class="font-mono tabular-nums">{Math.round(t * 100)}%</span>
				</p>
			</div>
			<div>
				<canvas
					bind:this={estCanvas}
					class="block h-40 w-40 rounded border border-rule [image-rendering:pixelated]"
				></canvas>
				<p class="mt-2 text-xs text-muted">denoiser’s estimate of the clean image</p>
			</div>
			<div class="min-w-56 flex-1">
				<label class="block">
					<span class="text-[10px] tracking-widest text-muted uppercase">Noise level</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						bind:value={t}
						class="mt-2 w-full text-muted accent-current"
						aria-label="Noise level"
					/>
				</label>
				<button
					type="button"
					onclick={() => (forwardSeed = Math.floor(Math.random() * 1e6))}
					class="mt-3 {btn}">New noise</button
				>
				{#if forward}
					<p class="mt-4 text-[10px] tracking-widest text-muted uppercase">
						Which training image the estimate leans on
					</p>
					<div class="mt-2 flex h-10 items-end gap-1">
						{#each forward.w as w, i (i)}
							<div
								class="w-6 rounded-t-xs {i === selected ? 'bg-bright' : 'bg-rule'}"
								style="height: {Math.max(2, w * 100)}%"
								title="image {i + 1}: {(w * 100).toFixed(0)}%"
							></div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
		<p class="mt-4 max-w-2xl font-serif text-sm leading-relaxed text-muted">
			At low noise the estimate is the selected image. At high noise the noisy input could have come
			from any image in the set, so the estimate is their average.
		</p>
	</section>

	<!-- Reverse -->
	<section class="mt-8 border-t border-rule pt-5">
		<p class="text-[10px] tracking-widest text-muted uppercase">Reverse: generating from noise</p>
		<div class="mt-3 flex flex-wrap items-start gap-6">
			<div>
				<canvas
					bind:this={genCanvas}
					class="block h-56 w-56 rounded border border-rule [image-rendering:pixelated]"
				></canvas>
				<p class="mt-2 font-mono text-xs text-muted tabular-nums">
					{#if gen}step {gen.step} / {steps}{:else}not started{/if}
				</p>
			</div>
			<div class="min-w-64 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<button type="button" onclick={generate} disabled={running} class={btn}>Generate</button>
					<span class="ml-2 text-[10px] tracking-widest text-muted uppercase">Seed</span>
					<input
						type="number"
						bind:value={seed}
						class="w-24 rounded border border-rule bg-transparent px-2 py-1 font-mono text-xs text-light tabular-nums"
						aria-label="Seed"
					/>
					<button type="button" onclick={() => (seed = Math.floor(Math.random() * 1e6))} class={btn}
						>Random</button
					>
				</div>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<span class="text-[10px] tracking-widest text-muted uppercase">Steps</span>
					{#each [5, 10, 25, 50] as s (s)}
						<button type="button" onclick={() => (steps = s)} class={pick(steps === s)}>{s}</button>
					{/each}
				</div>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<span class="text-[10px] tracking-widest text-muted uppercase">Scheduler</span>
					<button type="button" onclick={() => (eta = 0)} class={pick(eta === 0)}>DDIM</button>
					<button type="button" onclick={() => (eta = 1)} class={pick(eta === 1)}>DDPM</button>
				</div>
				{#if gen}
					<p class="mt-5 text-[10px] tracking-widest text-muted uppercase">
						Which training image it is converging to
					</p>
					<div class="mt-2 flex h-12 items-end gap-1">
						{#each gen.w as w, i (i)}
							<div
								class="w-6 rounded-t-xs {w === Math.max(...gen.w) ? 'bg-bright' : 'bg-rule'}"
								style="height: {Math.max(2, w * 100)}%"
								title="image {i + 1}: {(w * 100).toFixed(0)}%"
							></div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
		<p class="mt-4 max-w-2xl font-serif text-sm leading-relaxed text-muted">
			The seed sets the starting noise; the same seed always gives the same image. DDIM adds no
			noise after the first draw, so similar training images pull it to the same result. DDPM adds
			fresh noise at every step, so the seed matters more. Steps: fewer steps, coarser path.
		</p>
	</section>

	<!-- What it is -->
	<section class="prose mt-12 pb-24">
		<h2>What is running here</h2>
		<p>
			Forward process: x<sub>t</sub> = √ᾱ<sub>t</sub> x<sub>0</sub> + √(1−ᾱ<sub>t</sub>) ε, with ε
			gaussian and ᾱ<sub>t</sub> on a cosine schedule from 1 down to 0.
		</p>
		<p>
			Denoiser: the expected clean image given the noisy one. For a training set of a few images,
			that is exactly a weighted average of the set, each image weighted by how likely it is to have
			produced the input at this noise level. The bars show those weights. A trained network
			approximates this same quantity for a training set of billions of images it cannot store.
		</p>
		<p>
			Reverse process: at each step the denoiser estimates x<sub>0</sub>, the noise is re-estimated
			from it, and the pair is recombined at the next lower noise level. DDIM adds no randomness
			after the first draw. DDPM adds a fresh gaussian at each step, scaled to the schedule. Both
			are reproducible from the seed.
		</p>
		<p>
			With this few images the process lands on one of them exactly. That is what an ideal denoiser
			does on a small set. <a href="/lab/1">Back to Lab 01</a>.
		</p>
	</section>
</div>
