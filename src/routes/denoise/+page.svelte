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
	// With a mask, only the marked images count: that is the conditional
	// denoiser the guidance section uses. Callers pass a mask with at least one
	// image marked.
	function estimate(xt: Img, ab: number, mask?: boolean[]): { x0: Img; w: number[] } {
		const sa = Math.sqrt(ab);
		const varr = 1 - ab;
		const logits = dataset.map((xi, idx) => {
			if (mask && !mask[idx]) return -Infinity;
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
			if (playTimer) clearInterval(playTimer);
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

	// ---- step by step -----------------------------------------------------------
	// The same reverse process as Generate, computed all at once so it can be
	// stepped through like slides. Same seed, steps, scheduler and noise, so the
	// last slide is the image Generate produces. With a guide, each step blends
	// the unconditional and conditional estimates: x0 = u + s(c - u).
	type Frame = { x: Img; x0: Img; w: number[]; noise: number };

	function trajectory(
		seedv: number,
		stepsv: number,
		etav: number,
		guide: { mask: boolean[]; s: number } | null
	): Frame[] {
		if (dataset.length === 0) return [];
		const ts: number[] = [];
		for (let k = 0; k <= stepsv; k++) ts.push(1 - k / stepsv);
		let x = gaussian(seedv);
		const fresh = rng(seedv ^ 0x9e3779b9);
		const gauss1 = () => {
			const u = Math.max(fresh(), 1e-12);
			const v = fresh();
			return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
		};
		const est = (xt: Img, abv: number) => {
			const u = estimate(xt, abv);
			if (!guide) return u;
			const c = estimate(xt, abv, guide.mask);
			const x0 = new Float32Array(DIM);
			for (let i = 0; i < DIM; i++) x0[i] = u.x0[i] + guide.s * (c.x0[i] - u.x0[i]);
			return { x0, w: guide.s === 0 ? u.w : c.w };
		};
		let cur = est(x, alphaBar(ts[0]));
		const frames: Frame[] = [{ x, x0: cur.x0, w: cur.w, noise: 1 - alphaBar(ts[0]) }];
		for (let k = 0; k < stepsv; k++) {
			const abv = alphaBar(ts[k]);
			const tn = ts[k + 1];
			const abn = alphaBar(tn);
			const sa = Math.sqrt(abv);
			const sb = Math.sqrt(1 - abv);
			const san = Math.sqrt(abn);
			const sigma = tn === 0 ? 0 : etav * Math.sqrt(((1 - abn) / (1 - abv)) * (1 - abv / abn));
			const sbn = Math.sqrt(Math.max(0, 1 - abn - sigma * sigma));
			const next = new Float32Array(DIM);
			for (let i = 0; i < DIM; i++) {
				const eps = (x[i] - sa * cur.x0[i]) / sb;
				next[i] =
					tn === 0 ? cur.x0[i] : san * cur.x0[i] + sbn * eps + (sigma > 0 ? sigma * gauss1() : 0);
			}
			x = next;
			if (tn === 0) {
				frames.push({ x, x0: x, w: cur.w, noise: 0 });
			} else {
				cur = est(x, abn);
				frames.push({ x, x0: cur.x0, w: cur.w, noise: 1 - abn });
			}
		}
		return frames;
	}

	let slide = $state(0);
	let playing = $state(false);
	let playTimer: ReturnType<typeof setInterval> | null = null;
	const frames = $derived(trajectory(seed, steps, eta, null));
	const slideIdx = $derived(Math.min(slide, Math.max(0, frames.length - 1)));
	const stripIdx = $derived.by(() => {
		const n = frames.length;
		if (n <= 13) return frames.map((_, i) => i);
		const out = new Set<number>();
		for (let j = 0; j < 12; j++) out.add(Math.round((j * (n - 1)) / 11));
		return [...out];
	});

	function stopPlay() {
		if (playTimer) clearInterval(playTimer);
		playTimer = null;
		playing = false;
	}
	function togglePlay() {
		if (playing) return stopPlay();
		if (slideIdx >= frames.length - 1) slide = 0;
		playing = true;
		playTimer = setInterval(() => {
			if (slide >= frames.length - 1) return stopPlay();
			slide += 1;
		}, 380);
	}
	// A new seed, step count or scheduler is a new generation: start at slide 0.
	$effect(() => {
		frames;
		slide = 0;
		stopPlay();
	});

	function phase(noise: number, last: boolean): { title: string; body: string } {
		if (last)
			return {
				title: 'Finished',
				body: 'No noise left. With a training set this small, the ideal denoiser lands exactly on one training image. A network trained on billions of images cannot store them, so it lands somewhere new.'
			};
		if (noise > 0.85)
			return {
				title: 'Almost pure noise',
				body: 'The model can barely see anything, so its best guess is close to the average of every training image. The middle panel is a blur of the whole set, and the weights are spread out.'
			};
		if (noise > 0.5)
			return {
				title: 'The composition settles',
				body: 'Noise is still most of the picture, but the guess starts to commit. One training image begins to win and the weights concentrate on it. Large shapes are decided here, early.'
			};
		if (noise > 0.15)
			return {
				title: 'Detail sharpens',
				body: 'The overall structure is fixed. The guess barely changes now; the noisy image is catching up to it, and each step corrects smaller features.'
			};
		return {
			title: 'Fine grain',
			body: 'Only a little static is left. These last steps change very little you can see.'
		};
	}

	// The noise the model believes is in the image: what it will remove next.
	function noiseEstimate(f: Frame): Img | null {
		if (f.noise <= 0) return null;
		const sa = Math.sqrt(1 - f.noise);
		const sb = Math.sqrt(f.noise);
		const out = new Float32Array(DIM);
		for (let i = 0; i < DIM; i++) out[i] = (f.x[i] - sa * f.x0[i]) / sb / 2.5;
		return out;
	}

	let slideX: HTMLCanvasElement | undefined = $state();
	let slideEst: HTMLCanvasElement | undefined = $state();
	let slideEps: HTMLCanvasElement | undefined = $state();
	let stripCanvases = $state<(HTMLCanvasElement | undefined)[]>([]);

	$effect(() => {
		paletteTick;
		const f = frames[slideIdx];
		draw(slideX, f?.x ?? null);
		draw(slideEst, f?.x0 ?? null);
		draw(slideEps, f ? noiseEstimate(f) : null);
	});
	$effect(() => {
		paletteTick;
		stripIdx.forEach((fi, j) => draw(stripCanvases[j], frames[fi]?.x ?? null));
	});

	// ---- from words to numbers -----------------------------------------------
	// This toy has no text encoder, so the first three steps are illustrative:
	// a simplified tokenizer, hashed ids and made-up vectors, labelled as such.
	// The numbers quoted beside them are Stable Diffusion 1.x's real ones. The
	// guidance step at the end is real: it runs on the images above.
	const VOCAB = 49408;
	const CONTEXT = 77;
	let prompt = $state('a pizza on a wooden board, glowing');
	const SUFFIXES = ['ing', 'ed', 'ly', 'est', 'er', 'ness', 'tion', 's'];

	function tokenize(text: string): string[] {
		const words = text.toLowerCase().match(/[a-z0-9]+|[^\sa-z0-9]/g) ?? [];
		const out: string[] = [];
		for (const w of words) {
			const suf =
				w.length > 5 ? SUFFIXES.find((x) => w.endsWith(x) && w.length - x.length >= 3) : undefined;
			if (suf) out.push(w.slice(0, -suf.length), suf + '</w>');
			else out.push(w + '</w>');
		}
		return out;
	}
	function tokenId(tok: string): number {
		let h = 2166136261;
		for (let i = 0; i < tok.length; i++) {
			h ^= tok.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return (h >>> 0) % (VOCAB - 2);
	}
	function tokenVector(tok: string, dims = 12): number[] {
		const r = rng(tokenId(tok) + 11);
		return Array.from({ length: dims }, () => r() * 2 - 1);
	}

	const words = $derived(tokenize(prompt));
	const truncated = $derived(words.length > CONTEXT - 2);
	const seq = $derived(['<start>', ...words.slice(0, CONTEXT - 2), '<end>']);
	const ids = $derived(
		seq.map((t) => (t === '<start>' ? 49406 : t === '<end>' ? 49407 : tokenId(t)))
	);
	const vecs = $derived(seq.map((t) => tokenVector(t)));
	// After the encoder each token's vector carries some of its neighbours, so the
	// same word gets different numbers in different prompts.
	const ctxVecs = $derived(
		vecs.map((v, i) =>
			v.map((x, d) => {
				let sum = 0;
				let n = 0;
				for (let j = Math.max(0, i - 2); j <= Math.min(vecs.length - 1, i + 2); j++) {
					if (j === i) continue;
					sum += vecs[j][d];
					n++;
				}
				return n ? 0.55 * x + 0.45 * (sum / n) : x;
			})
		)
	);

	let marked = $state.raw<number[]>([0, 1]);
	const GUIDE_SCALES = [0, 1, 3, 7];
	const guideMask = $derived(dataset.map((_, i) => marked.includes(i)));
	const guidance = $derived.by(() => {
		if (dataset.length === 0 || !guideMask.some(Boolean)) return [];
		return GUIDE_SCALES.map((sc) => {
			const fr = trajectory(seed, steps, eta, { mask: guideMask, s: sc });
			const x = fr[fr.length - 1].x;
			let nearest = 0;
			let bestD = Infinity;
			dataset.forEach((xi, i) => {
				let d = 0;
				for (let k = 0; k < DIM; k++) {
					const e = x[k] - xi[k];
					d += e * e;
				}
				if (d < bestD) {
					bestD = d;
					nearest = i;
				}
			});
			return { s: sc, x, nearest, rms: Math.sqrt(bestD / DIM) };
		});
	});
	function toggleMark(i: number) {
		marked = marked.includes(i) ? marked.filter((x) => x !== i) : [...marked, i];
	}

	let guideThumbs = $state<(HTMLCanvasElement | undefined)[]>([]);
	let guideCanvases = $state<(HTMLCanvasElement | undefined)[]>([]);
	$effect(() => {
		paletteTick;
		dataset.forEach((img, i) => draw(guideThumbs[i], img));
	});
	$effect(() => {
		paletteTick;
		guidance.forEach((g, i) => draw(guideCanvases[i], g.x));
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

	<!-- Step by step -->
	<section class="mt-8 border-t border-rule pt-5">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<p class="text-[10px] tracking-widest text-muted uppercase">
				Step by step: from noise to an image
			</p>
			<p class="font-mono text-xs text-muted tabular-nums">
				seed {seed} · {steps} steps · {eta === 0 ? 'DDIM' : 'DDPM'}
			</p>
		</div>
		<p class="mt-2 max-w-2xl font-serif text-sm leading-relaxed text-muted">
			The generation above, one step per slide. It uses the seed, steps and scheduler set there, so
			the last slide is the image Generate produces. Each slide shows three things the model has at
			that moment.
		</p>

		{#if frames.length}
			{@const f = frames[slideIdx]}
			{@const ph = phase(f.noise, slideIdx === frames.length - 1)}
			<div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
				<figure>
					<canvas
						bind:this={slideX}
						class="block aspect-square w-full rounded border border-rule [image-rendering:pixelated]"
					></canvas>
					<figcaption>
						<span class="mt-2 block text-[10px] tracking-widest text-muted uppercase"
							>What it sees</span
						>
						<span class="mt-1 block font-serif text-xs text-muted"
							>The noisy image at this step.</span
						>
					</figcaption>
				</figure>
				<figure>
					<canvas
						bind:this={slideEst}
						class="block aspect-square w-full rounded border border-rule [image-rendering:pixelated]"
					></canvas>
					<figcaption>
						<span class="mt-2 block text-[10px] tracking-widest text-muted uppercase"
							>Its guess at the clean image</span
						>
						<span class="mt-1 block font-serif text-xs text-muted"
							>What the denoiser predicts once the noise is gone.</span
						>
					</figcaption>
				</figure>
				<figure>
					<canvas
						bind:this={slideEps}
						class="block aspect-square w-full rounded border border-rule [image-rendering:pixelated]"
					></canvas>
					<figcaption>
						<span class="mt-2 block text-[10px] tracking-widest text-muted uppercase"
							>The noise it thinks is there</span
						>
						<span class="mt-1 block font-serif text-xs text-muted"
							>The difference between the two: what it removes next.</span
						>
					</figcaption>
				</figure>
			</div>

			<div class="mt-5 rounded border border-rule p-4">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<p class="font-serif text-lg text-bright">{ph.title}</p>
					<p class="font-mono text-xs text-muted tabular-nums">
						step {slideIdx} of {frames.length - 1} · noise {(f.noise * 100).toFixed(0)}%
					</p>
				</div>
				<div class="mt-2 h-1 w-full bg-rule">
					<div class="h-full bg-bright transition-all" style="width: {f.noise * 100}%"></div>
				</div>
				<p class="mt-3 max-w-2xl font-serif text-sm leading-relaxed text-light">{ph.body}</p>
				<div class="mt-3 flex h-10 items-end gap-1">
					{#each f.w as w, i (i)}
						<div
							class="w-5 rounded-t-xs {w === Math.max(...f.w) ? 'bg-bright' : 'bg-rule'}"
							style="height: {Math.max(2, w * 100)}%"
							title="image {i + 1}: {(w * 100).toFixed(0)}%"
						></div>
					{/each}
				</div>
				<p class="mt-1 text-[10px] tracking-widest text-muted uppercase">
					Weight on each training image
				</p>
			</div>

			<div class="mt-4 flex flex-wrap items-center gap-2">
				<button
					type="button"
					class={btn}
					onclick={() => {
						stopPlay();
						slide = Math.max(0, slideIdx - 1);
					}}
					disabled={slideIdx === 0}>&larr; Previous</button
				>
				<button type="button" class={btn} onclick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
				<button
					type="button"
					class={btn}
					onclick={() => {
						stopPlay();
						slide = Math.min(frames.length - 1, slideIdx + 1);
					}}
					disabled={slideIdx === frames.length - 1}>Next &rarr;</button
				>
				<input
					type="range"
					min="0"
					max={frames.length - 1}
					value={slideIdx}
					oninput={(e) => {
						stopPlay();
						slide = Number(e.currentTarget.value);
					}}
					class="ml-2 min-w-40 flex-1"
					aria-label="Step"
				/>
			</div>

			<div class="mt-4 flex gap-1 overflow-x-auto pb-1">
				{#each stripIdx as fi, j (fi)}
					<button
						type="button"
						onclick={() => {
							stopPlay();
							slide = fi;
						}}
						class="shrink-0 rounded border p-0.5 {fi === slideIdx
							? 'border-bright'
							: 'border-rule hover:border-muted'}"
						aria-label="Go to step {fi}"
					>
						<canvas bind:this={stripCanvases[j]} class="block h-14 w-14 [image-rendering:pixelated]"
						></canvas>
						<span class="block text-center font-mono text-[9px] text-muted tabular-nums">{fi}</span>
					</button>
				{/each}
			</div>
		{:else}
			<p class="mt-4 font-mono text-xs text-muted">Loading the training set…</p>
		{/if}
	</section>

	<!-- From words to numbers -->
	<section class="mt-8 border-t border-rule pt-5">
		{#snippet vec(values: number[])}
			<div class="flex h-8 items-stretch gap-px" aria-hidden="true">
				{#each values as v, d (d)}
					<div class="relative w-1.5">
						<div
							class="absolute right-0 left-0 {v >= 0 ? 'bg-bright' : 'bg-muted'}"
							style={v >= 0 ? `bottom: 50%; height: ${v * 50}%` : `top: 50%; height: ${-v * 50}%`}
						></div>
					</div>
				{/each}
			</div>
		{/snippet}

		<p class="text-[10px] tracking-widest text-muted uppercase">
			From words to numbers: how a prompt gets in
		</p>
		<p class="mt-2 max-w-2xl font-serif text-sm leading-relaxed text-muted">
			The model on this page has no text encoder; it only denoises. Latent diffusion adds one. These
			steps follow a prompt from words to the numbers that steer each denoising step. Steps one to
			three are illustrations with Stable Diffusion's real figures beside them. Step five runs for
			real on the images above.
		</p>

		<label class="mt-4 block">
			<span class="text-[10px] tracking-widest text-muted uppercase">Prompt</span>
			<input
				bind:value={prompt}
				class="mt-1 w-full max-w-xl rounded border border-rule bg-transparent px-3 py-2 font-mono text-sm text-light"
			/>
		</label>

		<ol class="mt-6 flex flex-col gap-8">
			<li>
				<p class="font-serif text-base text-bright">1. The prompt is cut into tokens</p>
				<p class="mt-1 max-w-2xl font-serif text-sm leading-relaxed text-muted">
					Pieces from a fixed vocabulary, not whole words. Common words are one token; longer ones
					split. <span class="font-mono text-xs">&lt;/w&gt;</span> marks the end of a word, and
					every prompt is wrapped in start and end tokens. Stable Diffusion's text encoder reads at
					most {CONTEXT} tokens; anything past that is dropped.
				</p>
				<div class="mt-3 flex flex-wrap gap-1.5">
					{#each seq as tok, i (i)}
						<span
							class="rounded border px-2 py-1 font-mono text-xs {tok.startsWith('<')
								? 'border-rule text-muted'
								: 'border-muted text-light'}"
							>{tok.replace('</w>', '')}{#if tok.endsWith('</w>')}<span class="text-muted"
									>&lt;/w&gt;</span
								>{/if}</span
						>
					{/each}
				</div>
				<p class="mt-2 font-mono text-xs text-muted tabular-nums">
					{seq.length} of {CONTEXT} tokens used{#if truncated}; the rest were cut off{/if}
				</p>
				<p class="mt-1 font-serif text-xs text-muted/70">
					Simplified: the real tokenizer is byte-pair encoding over {VOCAB.toLocaleString()} pieces.
				</p>
			</li>

			<li>
				<p class="font-serif text-base text-bright">2. Each token becomes a number</p>
				<p class="mt-1 max-w-2xl font-serif text-sm leading-relaxed text-muted">
					Its position in the vocabulary. Start and end are 49406 and 49407, as in CLIP; the others
					here are made up.
				</p>
				<div class="mt-3 flex flex-wrap gap-1.5">
					{#each seq as tok, i (i)}
						<span class="flex flex-col items-center rounded border border-rule px-2 py-1">
							<span class="font-mono text-[10px] text-muted">{tok.replace('</w>', '')}</span>
							<span class="font-mono text-xs text-light tabular-nums">{ids[i]}</span>
						</span>
					{/each}
				</div>
			</li>

			<li>
				<p class="font-serif text-base text-bright">3. Each number becomes a list of numbers</p>
				<p class="mt-1 max-w-2xl font-serif text-sm leading-relaxed text-muted">
					A vector: 768 numbers per token in Stable Diffusion 1.x, twelve shown here. The looked-up
					vector is the same wherever the word appears. The text encoder then mixes each token with
					the others, so after it runs the same word carries different numbers in different prompts.
					Bars up are positive, bars down negative; the values are illustrative.
				</p>
				<div class="mt-3 overflow-x-auto">
					<div class="flex gap-3 pb-1">
						{#each seq as tok, i (i)}
							<div class="flex shrink-0 flex-col items-center gap-1">
								<span class="font-mono text-[10px] text-muted">{tok.replace('</w>', '')}</span>
								{@render vec(vecs[i])}
								{@render vec(ctxVecs[i])}
							</div>
						{/each}
					</div>
				</div>
				<p class="mt-1 font-mono text-[10px] text-muted">
					top row: looked up · bottom row: after the text encoder
				</p>
			</li>

			<li>
				<p class="font-serif text-base text-bright">4. The vectors steer every denoising step</p>
				<p class="mt-1 max-w-2xl font-serif text-sm leading-relaxed text-muted">
					This is cross-attention. At each step, every position in the image grid asks which tokens
					matter to it and mixes in their vectors. The questions come from the image, the answers
					from the words:
				</p>
				<p class="mt-2 font-mono text-sm text-light">
					Attention(Q, K, V) = softmax(QK<sup>T</sup> / √d) V
				</p>
				<p class="mt-2 max-w-2xl font-serif text-sm leading-relaxed text-muted">
					Q comes from the image, K and V from the prompt's vectors. The prompt never paints a
					pixel. It changes what the denoiser predicts the noise to be, at every one of the {steps}
					steps.
				</p>
			</li>

			<li>
				<p class="font-serif text-base text-bright">5. Guidance decides how hard to follow it</p>
				<p class="mt-1 max-w-2xl font-serif text-sm leading-relaxed text-muted">
					This part is real. Mark the training images that fit your prompt. The conditional denoiser
					only considers those; the unconditional one considers all of them. Each step uses <span
						class="font-mono text-xs text-light"
						>unconditional + s × (conditional − unconditional)</span
					>, where s is the guidance scale. Same seed for every result.
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each dataset as _, i (i)}
						<button
							type="button"
							onclick={() => toggleMark(i)}
							aria-pressed={marked.includes(i)}
							class="rounded border p-0.5 {marked.includes(i)
								? 'border-bright'
								: 'border-rule opacity-50 hover:opacity-100'}"
							aria-label="Image {i + 1}: {marked.includes(i) ? 'fits the prompt' : 'does not fit'}"
						>
							<canvas bind:this={guideThumbs[i]} class="block h-12 w-12 [image-rendering:pixelated]"
							></canvas>
						</button>
					{/each}
				</div>
				{#if guidance.length}
					<div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
						{#each guidance as g, i (g.s)}
							<figure>
								<canvas
									bind:this={guideCanvases[i]}
									class="block aspect-square w-full rounded border border-rule [image-rendering:pixelated]"
								></canvas>
								<figcaption>
									<span class="mt-2 block font-mono text-xs text-light tabular-nums">s = {g.s}</span
									>
									<span class="mt-0.5 block font-serif text-xs text-muted"
										>{g.s === 0
											? 'Ignores the prompt.'
											: g.s === 1
												? 'Follows the prompt.'
												: 'Follows it harder.'}
										{g.rms < 0.12
											? `Lands on image ${g.nearest + 1}${marked.includes(g.nearest) ? ', which you marked' : ', which you did not mark'}.`
											: `Not a training image: pushed past image ${g.nearest + 1}.`}</span
									>
								</figcaption>
							</figure>
						{/each}
					</div>
				{:else}
					<p class="mt-3 font-mono text-xs text-muted">Mark at least one image to see guidance.</p>
				{/if}
				{#if guidance.length}
					<p class="mt-3 max-w-2xl font-serif text-xs leading-relaxed text-muted/80">
						One honest limit. In a real model, a high guidance scale oversaturates the image and
						then breaks it. With only these few training images, both denoisers settle on the same
						picture once it is nearly clean, so their difference shrinks to nothing and even s = 7
						lands on a real training image.
					</p>
				{/if}
			</li>
		</ol>
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
