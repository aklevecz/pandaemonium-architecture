<script lang="ts">
	import { getPdfUrl } from '$lib/data/syllabus';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import NotesPanel from '$lib/components/NotesPanel.svelte';
	import SelectionTooltip from '$lib/components/SelectionTooltip.svelte';

	let { data } = $props();

	interface Note {
		id: number;
		content: string;
		created_at: string;
		updated_at: string;
	}
	interface Highlight {
		id: number;
		text: string;
		note: string;
		created_at: string;
	}

	// Notes/highlights state lives here (not in NotesPanel) because the
	// highlight DOM-marking logic operates on the prose element on this page.
	let notes: Note[] = $state([]);
	let highlights: Highlight[] = $state([]);
	let activeHighlight: Highlight | null = $state(null);

	// View / layout
	let viewMode: 'text' | 'pdf' = $state('text');
	let sidebarOpen = $state(false);
	let chatOpen = $state(false);
	let chatConversationCount = $state(0);
	let isMobile = $state(false);

	// Chat panel ref so the SelectionTooltip's "Explain" button can call
	// startNewChat() across components.
	let chatPanel: ChatPanel | undefined = $state();

	// Selection tooltip
	let selectionTooltip: { x: number; y: number; text: string } | null = $state(null);

	// Bookmark
	let savedPosition: number | null = $state(null);
	let bookmarkSaved = $state(false);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let bookmarkMarker: HTMLDivElement | undefined = $state();
	let proseEl: HTMLDivElement | undefined = $state();

	const user = $derived(data.user);
	const pdfUrl = $derived(getPdfUrl(data.pdf));

	if (browser) {
		isMobile = window.innerWidth < 640;
		window.addEventListener('resize', () => {
			isMobile = window.innerWidth < 640;
		});
	}

	// --- Bookmark --------------------------------------------------------------

	async function fetchBookmark() {
		if (!user) return;
		const res = await fetch(`/api/bookmarks?slug=${encodeURIComponent(data.slug)}`);
		if (res.ok) {
			const { position } = await res.json();
			savedPosition = position;
			requestAnimationFrame(updateBookmarkMarker);
		}
	}

	function updateBookmarkMarker() {
		if (!bookmarkMarker || savedPosition === null) return;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		const top = savedPosition * docHeight + 60;
		bookmarkMarker.style.top = `${top}px`;
	}

	async function saveBookmark() {
		if (!user) return;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		if (docHeight <= 0) return;
		const position = window.scrollY / docHeight;
		const res = await fetch('/api/bookmarks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: data.slug, position })
		});
		if (res.ok) {
			bookmarkSaved = true;
			savedPosition = position;
			requestAnimationFrame(updateBookmarkMarker);
			setTimeout(() => (bookmarkSaved = false), 1500);
		}
	}

	function resumeReading() {
		if (savedPosition === null) return;
		requestAnimationFrame(() => {
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			window.scrollTo({ top: savedPosition! * docHeight, behavior: 'smooth' });
		});
	}

	function handleScroll() {
		if (!user || viewMode !== 'text') return;
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			if (docHeight > 0) {
				const position = scrollTop / docHeight;
				fetch('/api/bookmarks', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ slug: data.slug, position })
				});
			}
		}, 3000);
	}

	// --- Notes -----------------------------------------------------------------

	async function fetchNotes() {
		if (!user) return;
		const res = await fetch(`/api/notes?slug=${encodeURIComponent(data.slug)}`);
		if (res.ok) notes = await res.json();
	}

	async function addNote(content: string) {
		await fetch('/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: data.slug, content })
		});
		await fetchNotes();
	}

	async function updateNote(id: number, content: string) {
		await fetch('/api/notes', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, content })
		});
		await fetchNotes();
	}

	async function deleteNote(id: number) {
		await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
		await fetchNotes();
	}

	// --- Highlights ------------------------------------------------------------

	async function fetchHighlights() {
		if (!user) return;
		const res = await fetch(`/api/highlights?slug=${encodeURIComponent(data.slug)}`);
		if (res.ok) {
			highlights = await res.json();
			requestAnimationFrame(() => applyHighlights());
		}
	}

	async function saveHighlight(text: string) {
		await fetch('/api/highlights', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: data.slug, text })
		});
		selectionTooltip = null;
		window.getSelection()?.removeAllRanges();
		await fetchHighlights();
	}

	async function deleteHighlight(id: number) {
		await fetch(`/api/highlights?id=${id}`, { method: 'DELETE' });
		activeHighlight = null;
		await fetchHighlights();
	}

	async function saveHighlightNote(id: number, note: string) {
		await fetch('/api/highlights', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, note })
		});
		activeHighlight = null;
		await fetchHighlights();
	}

	function applyHighlights() {
		if (!proseEl) return;
		proseEl.querySelectorAll('mark.hl').forEach((mark) => {
			const parent = mark.parentNode;
			if (parent) {
				parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
				parent.normalize();
			}
		});
		for (const h of highlights) {
			markTextInDom(proseEl, h);
		}
	}

	// Highlights every occurrence of `q` in the prose with <mark.search-hit>
	// styling and scrolls the first match into view. Triggered by ?q= from the
	// search page.
	function applyQueryHighlight(q: string) {
		if (!proseEl || !q.trim()) return;
		// Strip prior search marks first.
		proseEl.querySelectorAll('mark.search-hit').forEach((mark) => {
			const parent = mark.parentNode;
			if (parent) {
				parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
				parent.normalize();
			}
		});

		const needle = q.toLowerCase();
		const walker = document.createTreeWalker(proseEl, NodeFilter.SHOW_TEXT);
		const textNodes: Text[] = [];
		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) textNodes.push(node);

		let firstMark: HTMLElement | null = null;
		for (const tn of textNodes) {
			const text = tn.textContent ?? '';
			const lower = text.toLowerCase();
			if (!lower.includes(needle)) continue;
			const frag = document.createDocumentFragment();
			let cursor = 0;
			while (cursor < text.length) {
				const idx = lower.indexOf(needle, cursor);
				if (idx === -1) {
					frag.appendChild(document.createTextNode(text.slice(cursor)));
					break;
				}
				if (idx > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, idx)));
				const mark = document.createElement('mark');
				mark.className = 'search-hit';
				mark.textContent = text.slice(idx, idx + needle.length);
				frag.appendChild(mark);
				if (!firstMark) firstMark = mark;
				cursor = idx + needle.length;
			}
			tn.parentNode!.replaceChild(frag, tn);
		}

		if (firstMark) {
			firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	function markTextInDom(container: HTMLElement, h: Highlight) {
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
		const textNodes: Text[] = [];
		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			textNodes.push(node);
		}
		let fullText = '';
		const map: { node: Text; start: number }[] = [];
		for (const tn of textNodes) {
			map.push({ node: tn, start: fullText.length });
			fullText += tn.textContent || '';
		}
		const idx = fullText.indexOf(h.text);
		if (idx === -1) return;
		const end = idx + h.text.length;
		for (const entry of map) {
			const nodeText = entry.node.textContent || '';
			const nodeEnd = entry.start + nodeText.length;
			if (nodeEnd <= idx || entry.start >= end) continue;
			const sliceStart = Math.max(0, idx - entry.start);
			const sliceEnd = Math.min(nodeText.length, end - entry.start);
			const before = nodeText.slice(0, sliceStart);
			const matched = nodeText.slice(sliceStart, sliceEnd);
			const after = nodeText.slice(sliceEnd);
			const mark = document.createElement('mark');
			mark.textContent = matched;
			mark.className = 'hl highlight-mark';
			mark.addEventListener('click', () => {
				activeHighlight = h;
				sidebarOpen = true;
			});
			const frag = document.createDocumentFragment();
			if (before) frag.appendChild(document.createTextNode(before));
			frag.appendChild(mark);
			if (after) frag.appendChild(document.createTextNode(after));
			entry.node.parentNode!.replaceChild(frag, entry.node);
			break;
		}
	}

	// --- Selection -------------------------------------------------------------
	// Desktop fires mouseup reliably; iOS Safari does not (the native
	// selection-handle drag often suppresses it). selectionchange covers both
	// platforms but fires on every micro-update during drag, so we debounce
	// ~250ms — long enough for the user to settle on a passage, short enough
	// not to feel laggy.

	let selectionDebounce: ReturnType<typeof setTimeout> | null = null;

	function showSelectionTooltip() {
		if (!user || viewMode !== 'text') return;
		const sel = window.getSelection();
		const text = sel?.toString().trim();
		if (!text || text.length < 3) {
			selectionTooltip = null;
			return;
		}
		const range = sel!.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		// Anchor above the selection, but never above the viewport top —
		// otherwise on a selection near the top of a phone screen the tooltip
		// scrolls offscreen.
		const desiredTop = rect.top + window.scrollY - 10;
		const minTop = window.scrollY + 8;
		const top = desiredTop < minTop ? rect.bottom + window.scrollY + 12 : desiredTop;
		selectionTooltip = {
			x: rect.left + rect.width / 2,
			y: top,
			text
		};
	}

	function scheduleSelectionTooltip() {
		if (selectionDebounce) clearTimeout(selectionDebounce);
		selectionDebounce = setTimeout(showSelectionTooltip, 250);
	}

	function explainSelection(text: string) {
		// Capture roughly where in the reading this selection lives, so the
		// instructor dashboard can show passage clusters in document order.
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		const position = docHeight > 0 ? window.scrollY / docHeight : 0;
		selectionTooltip = null;
		window.getSelection()?.removeAllRanges();
		chatOpen = true;
		// chatPanel is bound after the {#if chatOpen} renders, which only happens
		// once chatOpen flips true. Wait one tick so the ref is wired up.
		requestAnimationFrame(() => chatPanel?.startNewChat(text, position));
	}

	$effect(() => {
		if (browser && user) {
			fetchNotes();
			fetchHighlights();
			fetchBookmark();
			window.addEventListener('scroll', handleScroll, { passive: true });
			return () => window.removeEventListener('scroll', handleScroll);
		}
	});

	// Re-apply query highlight whenever the URL ?q= changes or the prose
	// element mounts. Runs after a frame so any in-progress fetchHighlights()
	// re-render lands first.
	$effect(() => {
		const q = browser ? page.url.searchParams.get('q') : null;
		if (!q || !proseEl) return;
		requestAnimationFrame(() => applyQueryHighlight(q));
	});
</script>

<svelte:document
	onmouseup={showSelectionTooltip}
	onselectionchange={scheduleSelectionTooltip}
/>

<article class="mx-auto max-w-3xl px-4 sm:px-6">
	<div class="pt-8 sm:pt-10">
		{#if data.weekNumber}
			<a
				href="/week/{data.weekNumber}"
				class="text-xs text-muted transition-colors hover:text-white uppercase"
			>
				&larr; Week {String(data.weekNumber).padStart(2, '0')}
			</a>
		{:else}
			<a href="/" class="text-xs text-muted transition-colors hover:text-white uppercase">
				&larr; Back
			</a>
		{/if}
	</div>

	<header class="pb-8 pt-8 sm:pb-12 sm:pt-10">
		<p class="text-xs text-muted">{data.author}</p>
		<h1 class="mt-3 font-serif text-2xl font-normal leading-tight text-bright sm:text-4xl">
			{data.title}
		</h1>
		<div class="mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
			{#if data.weekNumber}
				<span class="text-xs text-muted">
					Week {String(data.weekNumber).padStart(2, '0')}
					<span class="hidden sm:inline">&mdash; {data.weekTitle}</span>
					{#if data.isAdditional}&mdash; Additional{/if}
				</span>
			{:else if data.isIntroductory}
				<span class="text-xs text-muted">Introductory Reading</span>
			{/if}
		</div>
	</header>

	<div class="h-px bg-rule"></div>

	{#if viewMode === 'text'}
		<div class="prose py-8 pb-20 sm:py-12 sm:pb-24" bind:this={proseEl}>
			{@html data.content}
		</div>
	{/if}
</article>

<!-- Bookmark marker -->
{#if savedPosition !== null && user && viewMode === 'text'}
	<div
		bind:this={bookmarkMarker}
		class="pointer-events-none absolute right-0 z-10"
		style="top: 0"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" class="text-bright/60"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
	</div>
{/if}

<!-- Floating toolbar -->
{#if user && viewMode === 'text'}
	<div class="fixed bottom-5 left-1/2 z-30 -translate-x-1/2">
		<div class="flex items-center gap-1 rounded-full border border-rule bg-dark/90 px-2 py-1.5 shadow-lg backdrop-blur-md">
			{#if savedPosition !== null}
				<button
					onclick={resumeReading}
					class="rounded-full p-2.5 text-light transition-colors hover:bg-rule/50 hover:text-bright"
					aria-label="Resume reading"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>
				</button>
				<div class="h-5 w-px bg-rule"></div>
			{/if}

			<button
				onclick={saveBookmark}
				class="rounded-full p-2.5 transition-colors {bookmarkSaved ? 'text-bright' : 'text-muted'} hover:bg-rule/50 hover:text-light"
				aria-label={bookmarkSaved ? 'Spot saved' : 'Save spot'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={bookmarkSaved ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
			</button>

			{#if isMobile}
				<a
					href={pdfUrl}
					target="_blank"
					rel="noopener"
					class="rounded-full p-2.5 text-muted transition-colors hover:bg-rule/50 hover:text-light"
					aria-label="Open PDF"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
				</a>
			{:else}
				<button
					onclick={() => (viewMode = 'pdf')}
					class="rounded-full p-2.5 text-muted transition-colors hover:bg-rule/50 hover:text-light"
					aria-label="View PDF"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
				</button>
			{/if}

			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="relative rounded-full p-2.5 text-muted transition-colors hover:bg-rule/50 hover:text-light"
				aria-label="Notes & Highlights"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
				{#if notes.length + highlights.length > 0}
					<span class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bright text-[10px] font-bold text-black">
						{notes.length + highlights.length}
					</span>
				{/if}
			</button>

			<button
				onclick={() => (chatOpen = !chatOpen)}
				class="relative rounded-full p-2.5 text-muted transition-colors hover:bg-rule/50 hover:text-light"
				aria-label="Ask about reading"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
				{#if chatConversationCount > 0}
					<span class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bright text-[10px] font-bold text-black">
						{chatConversationCount}
					</span>
				{/if}
			</button>
		</div>
	</div>
{/if}

<!-- PDF viewer (desktop only) -->
{#if viewMode === 'pdf' && !isMobile}
	<div class="fixed inset-0 z-40 bg-black pt-[49px] sm:pt-[57px]">
		<iframe src={pdfUrl} title={data.title} class="h-full w-full border-none"></iframe>
	</div>
{/if}

{#if user}
	<NotesPanel
		{notes}
		{highlights}
		{isMobile}
		open={sidebarOpen}
		{activeHighlight}
		onClose={() => (sidebarOpen = false)}
		onAddNote={addNote}
		onUpdateNote={updateNote}
		onDeleteNote={deleteNote}
		onSaveHighlightNote={saveHighlightNote}
		onDeleteHighlight={deleteHighlight}
		onClearActiveHighlight={() => (activeHighlight = null)}
		onSetActiveHighlight={(h) => (activeHighlight = h)}
	/>

	<ChatPanel
		bind:this={chatPanel}
		slug={data.slug}
		readingTitle={data.title}
		readingAuthor={data.author}
		{isMobile}
		open={chatOpen}
		onClose={() => (chatOpen = false)}
		onConversationCount={(n) => (chatConversationCount = n)}
	/>

	<SelectionTooltip
		tooltip={selectionTooltip}
		onHighlight={saveHighlight}
		onExplain={explainSelection}
	/>
{/if}
