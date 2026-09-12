<script lang="ts">
	// Lab deck. One slide on screen at a time, sized for the projector in the
	// room; arrow keys or swipe to move, F for real fullscreen, O for an index
	// so you can jump when a discussion runs long. The current slide lives in
	// ?s= so a slide can be linked to or reloaded into.
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { Slide } from '$lib/data/lab-decks/parse';
	import { weeks } from '$lib/data/syllabus';

	// The deck arrives from +page.server.ts, which decides whether this
	// viewer may see it at all — unpublished decks 404 before reaching here.
	let { data } = $props();

	type OfKind<K extends Slide['kind']> = Extract<Slide, { kind: K }>;

	const lab = $derived(data.lab);
	const week = $derived(weeks.find((w) => w.number === Number(page.params.num)));
	const total = $derived(lab?.slides.length ?? 0);

	// ?s= is 1-based for the audience; the index is 0-based.
	let i = $state(Math.max(0, Number(page.url.searchParams.get('s') ?? 1) - 1) || 0);
	let showIndex = $state(false);
	let isFull = $state(false);
	let stage = $state<HTMLElement | undefined>();

	const slide = $derived(lab?.slides[Math.min(i, total - 1)]);

	function go(n: number) {
		if (total === 0) return;
		i = Math.max(0, Math.min(total - 1, n));
		showIndex = false;
	}

	// Keep the URL in step without stacking history entries — a deck you have
	// clicked through 20 times shouldn't need 20 back presses to leave.
	$effect(() => {
		const s = i + 1;
		if (Number(page.url.searchParams.get('s') ?? 1) === s) return;
		const url = new URL(page.url);
		url.searchParams.set('s', String(s));
		try {
			replaceState(url, {});
		} catch {
			// Router not ready (or shallow routing unavailable): the deck still works.
		}
	});

	function toggleFullscreen() {
		if (!document.fullscreenElement) stage?.requestFullscreen?.().catch(() => {});
		else document.exitFullscreen?.();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		const t = e.target as HTMLElement | null;
		if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown':
			case 'PageDown':
			case ' ':
				e.preventDefault();
				go(i + 1);
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
			case 'PageUp':
				e.preventDefault();
				go(i - 1);
				break;
			case 'Home':
				e.preventDefault();
				go(0);
				break;
			case 'End':
				e.preventDefault();
				go(total - 1);
				break;
			case 'f':
			case 'F':
				e.preventDefault();
				toggleFullscreen();
				break;
			case 'o':
			case 'O':
				e.preventDefault();
				showIndex = !showIndex;
				break;
			case 'Escape':
				if (showIndex) showIndex = false;
				break;
		}
	}

	// Swipe, for presenting off a tablet or phone.
	let swipeFrom: { x: number; y: number } | null = null;

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType === 'mouse') return;
		swipeFrom = { x: e.clientX, y: e.clientY };
	}

	function onPointerUp(e: PointerEvent) {
		if (!swipeFrom) return;
		const dx = e.clientX - swipeFrom.x;
		const dy = e.clientY - swipeFrom.y;
		swipeFrom = null;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? i + 1 : i - 1);
	}

	// One short line per slide for the index overlay.
	function label(s: Slide): string {
		switch (s.kind) {
			case 'title':
				return s.title;
			case 'statement':
				return s.text;
			case 'prose':
				return s.heading ?? s.body[0];
			case 'list':
				return s.heading ?? s.items[0];
			case 'quote':
				return s.source;
			case 'image':
			case 'video':
				return s.caption ?? s.alt;
			case 'demo':
				return s.heading;
			case 'prompt':
				return s.heading;
		}
	}

	function isExternal(href: string) {
		return /^https?:\/\//.test(href);
	}
</script>

<svelte:head>
	<title
		>{lab ? `Lab ${String(lab.number).padStart(2, '0')} · ${lab.title}` : 'Lab'} · Pandaemonium Architecture</title
	>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<svelte:document onfullscreenchange={() => (isFull = !!document.fullscreenElement)} />

{#if lab && slide}
	{@const s = slide}
	<div
		bind:this={stage}
		onpointerdown={onPointerDown}
		onpointerup={onPointerUp}
		role="region"
		aria-label="Lab slides"
		class="relative flex flex-col bg-black {isFull ? 'h-screen' : 'h-[calc(100dvh-var(--nav-h))]'}"
	>
		<!-- Slide -->
		<div class="flex-1 overflow-y-auto">
			<div
				class="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-10 sm:px-10 sm:py-14"
			>
				{#if s.kind === 'title'}
					{@const t = s as OfKind<'title'>}
					<div>
						{#if t.eyebrow}
							<p class="text-[11px] tracking-widest text-muted uppercase sm:text-xs">{t.eyebrow}</p>
						{/if}
						<h1
							class="mt-6 font-serif text-4xl leading-tight font-normal text-bright sm:text-6xl md:text-7xl"
						>
							{t.title}
						</h1>
						{#if t.subtitle}
							<p class="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-gray sm:text-2xl">
								{t.subtitle}
							</p>
						{/if}
					</div>
				{:else if s.kind === 'statement'}
					{@const t = s as OfKind<'statement'>}
					<div>
						<p
							class="font-serif text-2xl leading-tight text-balance text-bright sm:text-4xl md:text-5xl"
						>
							{t.text}
						</p>
						{#if t.note}
							<p class="mt-8 text-sm text-muted sm:text-base">{t.note}</p>
						{/if}
					</div>
				{:else if s.kind === 'prose'}
					{@const t = s as OfKind<'prose'>}
					<div>
						{#if t.heading}
							<h2 class="text-xs tracking-widest text-muted uppercase sm:text-sm">{t.heading}</h2>
						{/if}
						<div class="mt-6 space-y-5 sm:space-y-6">
							{#each t.body as para, n (n)}
								<p
									class="font-serif text-lg leading-relaxed text-gray sm:text-2xl sm:leading-relaxed"
								>
									{para}
								</p>
							{/each}
						</div>
					</div>
				{:else if s.kind === 'list'}
					{@const t = s as OfKind<'list'>}
					<!-- Long lists step down a size so a six-item slide still fits the
					     screen — a projected slide you have to scroll is a bug. -->
					{@const dense = t.items.length > 4}
					<div>
						{#if t.heading}
							<h2 class="text-xs tracking-widest text-muted uppercase sm:text-sm">{t.heading}</h2>
						{/if}
						<ul class="mt-6 {dense ? 'space-y-3 sm:space-y-4' : 'space-y-4 sm:space-y-6'}">
							{#each t.items as item, n (n)}
								<li class="flex gap-4 sm:gap-6">
									<span
										class="mt-1 shrink-0 font-mono text-xs text-muted tabular-nums sm:mt-2 sm:text-sm"
									>
										{t.ordered ? String(n + 1).padStart(2, '0') : '—'}
									</span>
									<span
										class="font-serif leading-relaxed text-gray {dense
											? 'text-base sm:text-xl'
											: 'text-lg sm:text-2xl'}">{item}</span
									>
								</li>
							{/each}
						</ul>
					</div>
				{:else if s.kind === 'quote'}
					{@const t = s as OfKind<'quote'>}
					<blockquote class="border-l-2 border-rule pl-6 sm:pl-10">
						<p class="font-serif text-xl leading-relaxed text-light italic sm:text-3xl">
							&ldquo;{t.text}&rdquo;
						</p>
						<cite class="mt-6 block text-xs text-muted not-italic sm:text-sm">
							&mdash; {t.source}
						</cite>
					</blockquote>
				{:else if s.kind === 'image'}
					{@const t = s as OfKind<'image'>}
					<figure>
						<img src={t.src} alt={t.alt} class="mx-auto max-h-[70vh] w-auto max-w-full rounded" />
						{#if t.caption}
							<figcaption class="mt-4 text-center text-xs text-muted sm:text-sm">
								{t.caption}
							</figcaption>
						{/if}
					</figure>
				{:else if s.kind === 'video'}
					{@const t = s as OfKind<'video'>}
					<figure>
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							src={t.src}
							aria-label={t.alt}
							class="mx-auto max-h-[62vh] w-auto max-w-full rounded"
							autoplay
							muted
							loop
							playsinline
							controls
						></video>
						{#if t.caption}
							<figcaption class="mt-4 text-center text-xs text-muted sm:text-sm">
								{t.caption}
							</figcaption>
						{/if}
					</figure>
				{:else if s.kind === 'demo'}
					{@const t = s as OfKind<'demo'>}
					<!-- Internal demos open in this tab and carry the slide they came
					     from, so their back link (and plain browser back) return here,
					     not to the top of the deck. External tools still get a tab. -->
					{@const external = isExternal(t.href)}
					<div>
						<p class="text-[11px] tracking-widest text-muted uppercase sm:text-xs">Live</p>
						<h2 class="mt-3 font-serif text-3xl text-bright sm:text-5xl">{t.heading}</h2>
						{#if t.body}
							<p class="mt-4 max-w-2xl font-serif text-base leading-relaxed text-gray sm:text-xl">
								{t.body}
							</p>
						{/if}
						<a
							href={external
								? t.href
								: `${t.href}${t.href.includes('?') ? '&' : '?'}lab=${lab.number}&slide=${i + 1}`}
							target={external ? '_blank' : undefined}
							rel={external ? 'noreferrer' : undefined}
							class="group mt-8 inline-flex items-center gap-3 rounded border border-rule px-5 py-3 no-underline transition-colors hover:border-muted hover:bg-rule/20"
						>
							<span class="font-serif text-base text-light group-hover:text-bright sm:text-xl"
								>{t.label}</span
							>
							<span
								class="text-sm text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-light"
								aria-hidden="true">&rarr;</span
							>
						</a>
						{#if t.steps}
							<ol class="mt-8 space-y-3 border-t border-rule pt-6">
								{#each t.steps as step, n (n)}
									<li class="flex gap-4">
										<span class="mt-0.5 shrink-0 font-mono text-xs text-muted tabular-nums"
											>{String(n + 1).padStart(2, '0')}</span
										>
										<span class="font-serif text-base leading-relaxed text-gray sm:text-lg"
											>{step}</span
										>
									</li>
								{/each}
							</ol>
						{/if}
					</div>
				{:else if s.kind === 'prompt'}
					{@const t = s as OfKind<'prompt'>}
					<div>
						<p class="text-[11px] tracking-widest text-muted uppercase sm:text-xs">Assignment</p>
						<h2 class="mt-3 font-serif text-3xl text-bright sm:text-5xl">{t.heading}</h2>
						{#if t.body}
							<p class="mt-4 max-w-2xl font-serif text-base leading-relaxed text-gray sm:text-xl">
								{t.body}
							</p>
						{/if}
						{#if t.items}
							<ul class="mt-6 divide-y divide-rule border-y border-rule">
								{#each t.items as item, n (n)}
									<li class="py-4 font-serif text-base leading-relaxed text-gray sm:text-lg">
										{item}
									</li>
								{/each}
							</ul>
						{/if}
						{#if t.deliverable}
							<p class="mt-6 text-sm text-muted sm:text-base">{t.deliverable}</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Controls -->
		<div class="border-t border-rule">
			<div class="h-px w-full bg-rule/40">
				<div
					class="h-px bg-muted transition-[width] duration-200"
					style="width: {total <= 1 ? 100 : (i / (total - 1)) * 100}%"
				></div>
			</div>
			<div class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-10">
				<div class="flex items-center gap-4">
					{#if !isFull}
						<a
							href="/lab"
							class="text-[10px] tracking-widest text-muted uppercase transition-colors hover:text-white"
							>Labs</a
						>
					{/if}
					<button
						type="button"
						onclick={() => (showIndex = !showIndex)}
						class="font-mono text-xs text-muted tabular-nums transition-colors hover:text-white"
						aria-expanded={showIndex}
					>
						{String(i + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
					</button>
					<span class="hidden text-[10px] tracking-widest text-muted/70 uppercase sm:inline">
						&larr; &rarr; move &middot; O index &middot; F full
					</span>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => go(i - 1)}
						disabled={i === 0}
						class="rounded border border-rule px-3 py-1.5 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright disabled:opacity-30"
						aria-label="Previous slide">&larr;</button
					>
					<button
						type="button"
						onclick={() => go(i + 1)}
						disabled={i === total - 1}
						class="rounded border border-rule px-3 py-1.5 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright disabled:opacity-30"
						aria-label="Next slide">&rarr;</button
					>
					<button
						type="button"
						onclick={toggleFullscreen}
						class="ml-1 rounded border border-rule px-3 py-1.5 text-[10px] tracking-widest text-muted uppercase transition-colors hover:border-muted hover:text-light"
					>
						{isFull ? 'Exit' : 'Full'}
					</button>
				</div>
			</div>
		</div>

		<!-- Jump-to index -->
		{#if showIndex}
			<div class="absolute inset-0 z-10 overflow-y-auto bg-black px-6 py-10 sm:px-10">
				<div class="mx-auto max-w-3xl">
					<div class="flex items-baseline justify-between">
						<p class="text-[10px] tracking-widest text-muted uppercase">
							Lab {String(lab.number).padStart(2, '0')} · {lab.title}
						</p>
						<button
							type="button"
							onclick={() => (showIndex = false)}
							class="text-[10px] tracking-widest text-muted uppercase transition-colors hover:text-white"
							>Close</button
						>
					</div>
					<ul class="mt-6 divide-y divide-rule border-y border-rule">
						{#each lab.slides as sl, n (n)}
							<li>
								<button
									type="button"
									onclick={() => go(n)}
									class="flex w-full items-baseline gap-4 py-3 text-left transition-colors hover:bg-rule/20"
								>
									<span class="shrink-0 font-mono text-xs text-muted tabular-nums"
										>{String(n + 1).padStart(2, '0')}</span
									>
									<span
										class="font-serif text-sm leading-snug sm:text-base {n === i
											? 'text-bright'
											: 'text-gray'}">{label(sl)}</span
									>
								</button>
							</li>
						{/each}
					</ul>
					{#if week}
						<a
							href="/week/{week.number}"
							class="mt-8 inline-block text-xs text-muted uppercase transition-colors hover:text-white"
							>Week {String(week.number).padStart(2, '0')} &rarr;</a
						>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<p class="text-sm text-muted">No deck for this lab yet.</p>
			<a href="/lab" class="mt-4 inline-block text-xs text-white hover:underline">&larr; All labs</a
			>
		</div>
	</div>
{/if}
