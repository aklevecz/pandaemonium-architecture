<script lang="ts">
	import { getPdfUrl } from '$lib/data/syllabus';
	import { browser } from '$app/environment';
	import ChatMessage from '$lib/components/ChatMessage.svelte';

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

	let notes: Note[] = $state([]);
	let highlights: Highlight[] = $state([]);
	let newNote = $state('');
	let editingId: number | null = $state(null);
	let editContent = $state('');
	let viewMode: 'text' | 'pdf' = $state('text');
	let sidebarOpen = $state(false);
	let isMobile = $state(false);

	// Highlight state
	let selectionTooltip: { x: number; y: number; text: string } | null = $state(null);
	let activeHighlight: Highlight | null = $state(null);
	let highlightNoteText = $state('');

	// Bookmark state
	let savedPosition: number | null = $state(null);
	let bookmarkSaved = $state(false);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let bookmarkMarker: HTMLDivElement | undefined = $state();

	// Chat state
	interface ChatMessage {
		role: 'user' | 'assistant';
		content: string;
	}
	interface Conversation {
		id: number;
		title: string;
		created_at: string;
	}
	let chatOpen = $state(false);
	let chatMessages: ChatMessage[] = $state([]);
	let chatInput = $state('');
	let chatLoading = $state(false);
	let chatStreaming = $state(false);
	let chatAbort: AbortController | null = $state(null);
	let conversations: Conversation[] = $state([]);
	let activeConversationId: number | null = $state(null);
	let chatSelectedText = $state('');
	let chatEl: HTMLDivElement | undefined = $state();

	const user = $derived(data.user);
	const pdfUrl = $derived(getPdfUrl(data.pdf));

	let proseEl: HTMLDivElement | undefined = $state();

	if (browser) {
		isMobile = window.innerWidth < 640;
		window.addEventListener('resize', () => {
			isMobile = window.innerWidth < 640;
		});
	}

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

	async function fetchNotes() {
		if (!user) return;
		const res = await fetch(`/api/notes?slug=${encodeURIComponent(data.slug)}`);
		if (res.ok) notes = await res.json();
	}

	async function fetchHighlights() {
		if (!user) return;
		const res = await fetch(`/api/highlights?slug=${encodeURIComponent(data.slug)}`);
		if (res.ok) {
			highlights = await res.json();
			requestAnimationFrame(() => applyHighlights());
		}
	}

	async function addNote() {
		if (!newNote.trim()) return;
		await fetch('/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: data.slug, content: newNote })
		});
		newNote = '';
		await fetchNotes();
	}

	async function updateNote(id: number) {
		if (!editContent.trim()) return;
		await fetch('/api/notes', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, content: editContent })
		});
		editingId = null;
		await fetchNotes();
	}

	async function deleteNote(id: number) {
		await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
		await fetchNotes();
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

	async function saveHighlightNote(id: number) {
		await fetch('/api/highlights', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, note: highlightNoteText })
		});
		activeHighlight = null;
		await fetchHighlights();
	}

	function handleMouseUp() {
		if (!user || viewMode !== 'text') return;
		const sel = window.getSelection();
		const text = sel?.toString().trim();
		if (!text || text.length < 3) {
			selectionTooltip = null;
			return;
		}
		const range = sel!.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		selectionTooltip = {
			x: rect.left + rect.width / 2,
			y: rect.top + window.scrollY - 10,
			text
		};
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
				highlightNoteText = h.note;
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

	// Chat functions
	async function fetchConversations() {
		if (!user) return;
		const res = await fetch(`/api/chat?slug=${encodeURIComponent(data.slug)}`);
		if (res.ok) conversations = await res.json();
	}

	let conversationLoading = $state(false);
	const inActiveView = $derived(
		activeConversationId !== null || chatMessages.length > 0 || chatLoading || conversationLoading
	);
	function backToConversationList() {
		activeConversationId = null;
		chatMessages = [];
		chatSelectedText = '';
	}

	async function loadConversation(id: number) {
		activeConversationId = id;
		chatMessages = [];
		conversationLoading = true;
		try {
			const res = await fetch(`/api/chat?id=${id}`);
			if (res.ok) chatMessages = await res.json();
		} finally {
			conversationLoading = false;
			scrollChat();
		}
	}

	function abortChat() {
		chatAbort?.abort();
	}

	async function sendChat() {
		if (!chatInput.trim() || chatLoading || chatStreaming) return;
		const msg = chatInput;
		chatInput = '';
		// Optimistic: push user message + an empty assistant placeholder we'll
		// stream into.
		chatMessages = [
			...chatMessages,
			{ role: 'user', content: msg },
			{ role: 'assistant', content: '' }
		];
		const assistantIdx = chatMessages.length - 1;
		chatLoading = true;
		chatStreaming = true;
		const abort = new AbortController();
		chatAbort = abort;
		scrollChat();

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: abort.signal,
				body: JSON.stringify({
					slug: data.slug,
					conversationId: activeConversationId,
					message: msg,
					readingTitle: data.title,
					readingAuthor: data.author,
					selectedText: chatSelectedText || undefined
				})
			});
			if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let streamFinished = false;
			let receivedAnyDelta = false;
			while (!streamFinished) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				let nl: number;
				while ((nl = buffer.indexOf('\n')) !== -1) {
					const line = buffer.slice(0, nl).trim();
					buffer = buffer.slice(nl + 1);
					if (!line) continue;
					let evt: { type: string; conversationId?: number; text?: string; message?: string };
					try { evt = JSON.parse(line); } catch { continue; }
					if (evt.type === 'init' && evt.conversationId) {
						activeConversationId = evt.conversationId;
					} else if (evt.type === 'delta' && evt.text) {
						// Once the first delta lands, drop the "Thinking" indicator.
						if (!receivedAnyDelta) {
							receivedAnyDelta = true;
							chatLoading = false;
						}
						chatMessages[assistantIdx].content += evt.text;
						scrollChat();
					} else if (evt.type === 'done') {
						streamFinished = true;
					} else if (evt.type === 'error') {
						chatMessages[assistantIdx].content =
							(chatMessages[assistantIdx].content || '') +
							`\n\n*[error: ${evt.message ?? 'request failed'}]*`;
						streamFinished = true;
					}
				}
			}

			chatSelectedText = '';
			fetchConversations();
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				// User-initiated; partial text already in the bubble. Server's
				// finally clause persisted whatever streamed.
				chatMessages[assistantIdx].content =
					(chatMessages[assistantIdx].content || '') + '\n\n*[stopped]*';
				fetchConversations();
			} else {
				chatMessages[assistantIdx].content =
					chatMessages[assistantIdx].content ||
					`*[network error: ${err instanceof Error ? err.message : 'unknown'}]*`;
			}
		} finally {
			chatLoading = false;
			chatStreaming = false;
			chatAbort = null;
			scrollChat();
		}
	}

	async function deleteConversation(id: number) {
		await fetch(`/api/chat?id=${id}`, { method: 'DELETE' });
		if (activeConversationId === id) {
			activeConversationId = null;
			chatMessages = [];
		}
		await fetchConversations();
	}

	function startNewChat(selectedText?: string) {
		activeConversationId = null;
		chatMessages = [];
		chatSelectedText = selectedText || '';
		if (selectedText) {
			const truncated = selectedText.length > 150
				? selectedText.slice(0, 150) + '...'
				: selectedText;
			chatInput = `Explain this passage: "${truncated}"`;
			// Open panel and fire sendChat in the same tick so the user sees
			// their message + thinking indicator immediately, with no flash of
			// the conversation list.
			chatOpen = true;
			sendChat();
		} else {
			chatOpen = true;
		}
		fetchConversations();
	}

	function scrollChat() {
		requestAnimationFrame(() => {
			if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
		});
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
</script>

<svelte:document onmouseup={handleMouseUp} />

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
				<!-- Resume -->
				<button
					onclick={resumeReading}
					class="rounded-full p-2.5 text-light transition-colors hover:bg-rule/50 hover:text-bright"
					aria-label="Resume reading"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>
				</button>
				<div class="h-5 w-px bg-rule"></div>
			{/if}

			<!-- Bookmark -->
			<button
				onclick={saveBookmark}
				class="rounded-full p-2.5 transition-colors {bookmarkSaved ? 'text-bright' : 'text-muted'} hover:bg-rule/50 hover:text-light"
				aria-label={bookmarkSaved ? 'Spot saved' : 'Save spot'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={bookmarkSaved ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
			</button>

			<!-- PDF -->
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

			<!-- Notes -->
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

			<!-- Chat -->
			<button
				onclick={() => { chatOpen = !chatOpen; if (chatOpen) fetchConversations(); }}
				class="relative rounded-full p-2.5 text-muted transition-colors hover:bg-rule/50 hover:text-light"
				aria-label="Ask about reading"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
				{#if conversations.length > 0}
					<span class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bright text-[10px] font-bold text-black">
						{conversations.length}
					</span>
				{/if}
			</button>
		</div>
	</div>
{/if}

<!-- PDF viewer (desktop only, mobile opens in new tab) -->
{#if viewMode === 'pdf' && !isMobile}
	<div class="fixed inset-0 z-40 bg-black pt-[49px] sm:pt-[57px]">
		<iframe src={pdfUrl} title={data.title} class="h-full w-full border-none"></iframe>
	</div>
{/if}

<!-- Notes sidebar (desktop) / drawer (mobile) -->
{#if sidebarOpen && user}
	<!-- Mobile: full-screen overlay -->
	{#if isMobile}
		<div class="fixed inset-0 z-40 overflow-y-auto bg-black p-4 pt-14">
			<div class="flex items-center justify-between">
				<p class="text-xs tracking-widest text-muted uppercase">Notes & Highlights</p>
				<button
					onclick={() => (sidebarOpen = false)}
					class="px-2 py-1 text-sm text-muted hover:text-light"
				>
					&times; Close
				</button>
			</div>

			{@render notesContent()}
		</div>
	{:else}
		<!-- Desktop: fixed sidebar -->
		<aside class="fixed top-[57px] right-0 bottom-0 w-72 overflow-y-auto border-l border-rule bg-black p-5">
			<div class="flex items-center justify-between">
				<p class="text-xs tracking-widest text-muted uppercase">Notes & Highlights</p>
				<button
					onclick={() => (sidebarOpen = false)}
					class="text-sm text-muted hover:text-light"
				>
					&times;
				</button>
			</div>

			{@render notesContent()}
		</aside>
	{/if}
{/if}

<!-- Chat panel -->
{#if chatOpen && user}
	{#if isMobile}
		<div class="fixed inset-0 z-40 flex flex-col bg-black">
			<div class="flex items-center justify-between border-b border-rule px-4 py-3">
				{#if inActiveView}
					<button onclick={backToConversationList} class="text-xs text-muted hover:text-light">&larr; Back</button>
				{:else}
					<p class="text-xs tracking-widest text-muted uppercase">Chat</p>
				{/if}
				<button onclick={() => (chatOpen = false)} class="px-2 py-1 text-sm text-muted hover:text-light">&times; Close</button>
			</div>
			{@render chatContent()}
		</div>
	{:else}
		<aside class="fixed top-[57px] right-0 bottom-0 z-40 flex w-80 flex-col border-l border-rule bg-black">
			<div class="flex items-center justify-between border-b border-rule px-4 py-3">
				{#if inActiveView}
					<button onclick={backToConversationList} class="text-xs text-muted hover:text-light">&larr; Conversations</button>
				{:else}
					<p class="text-xs tracking-widest text-muted uppercase">Chat</p>
				{/if}
				<button onclick={() => (chatOpen = false)} class="text-sm text-muted hover:text-light">&times;</button>
			</div>
			{@render chatContent()}
		</aside>
	{/if}
{/if}

<!-- Selection tooltip -->
{#if selectionTooltip && user}
	<div
		class="highlight-tooltip absolute z-50 -translate-x-1/2 -translate-y-full"
		style="left: {selectionTooltip.x}px; top: {selectionTooltip.y}px;"
	>
		<div class="flex overflow-hidden rounded-lg border border-rule bg-dark shadow-lg">
			<button
				onclick={() => saveHighlight(selectionTooltip!.text)}
				class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
			>
				Highlight
			</button>
			<div class="w-px bg-rule"></div>
			<button
				onclick={() => { const t = selectionTooltip!.text; selectionTooltip = null; window.getSelection()?.removeAllRanges(); startNewChat(t); }}
				class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
			>
				Explain
			</button>
		</div>
	</div>
{/if}

{#snippet notesContent()}
	<!-- Add note -->
	<form onsubmit={(e) => { e.preventDefault(); addNote(); }} class="mt-4">
		<textarea
			bind:value={newNote}
			placeholder="Add a note..."
			rows="3"
			class="w-full resize-none border border-rule bg-dark px-3 py-2 font-serif text-sm text-white outline-none placeholder:text-muted focus:border-muted"
		></textarea>
		<button
			type="submit"
			disabled={!newNote.trim()}
			class="mt-2 border border-rule px-3 py-1 text-xs text-muted transition-colors hover:border-muted hover:text-light uppercase disabled:opacity-30"
		>
			Save
		</button>
	</form>

	<!-- Notes list -->
	{#if notes.length > 0}
		<div class="mt-6">
			<p class="text-xs text-muted uppercase">Notes</p>
			<div class="mt-2 divide-y divide-rule">
				{#each notes as note (note.id)}
					<div class="py-3">
						{#if editingId === note.id}
							<textarea
								bind:value={editContent}
								rows="3"
								class="w-full resize-none border border-rule bg-dark px-2 py-1 font-serif text-sm text-white outline-none focus:border-muted"
							></textarea>
							<div class="mt-1 flex gap-2">
								<button onclick={() => updateNote(note.id)} class="text-xs text-muted hover:text-light">Save</button>
								<button onclick={() => (editingId = null)} class="text-xs text-muted hover:text-light">Cancel</button>
							</div>
						{:else}
							<p class="whitespace-pre-wrap font-serif text-sm text-gray">{note.content}</p>
							<div class="mt-1 flex gap-2">
								<button onclick={() => { editingId = note.id; editContent = note.content; }} class="text-xs text-muted hover:text-light">Edit</button>
								<button onclick={() => deleteNote(note.id)} class="text-xs text-muted hover:text-light">Delete</button>
								<span class="text-xs text-muted">{new Date(note.updated_at).toLocaleDateString()}</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Highlights list -->
	{#if highlights.length > 0}
		<div class="mt-6">
			<p class="text-xs text-muted uppercase">Highlights</p>
			<div class="mt-2 space-y-3">
				{#each highlights as h (h.id)}
					<div
						class="border-l-2 py-1 pl-3 {activeHighlight?.id === h.id ? 'border-yellow-400' : 'border-yellow-500/30'}"
					>
						<p class="font-serif text-xs text-light italic leading-relaxed">
							&ldquo;{h.text.length > 100 ? h.text.slice(0, 100) + '...' : h.text}&rdquo;
						</p>
						{#if activeHighlight?.id === h.id}
							<textarea
								bind:value={highlightNoteText}
								placeholder="Add a note..."
								rows="2"
								class="mt-2 w-full resize-none border border-rule bg-dark px-2 py-1 text-xs text-white outline-none placeholder:text-muted focus:border-muted"
							></textarea>
							<div class="mt-1 flex gap-2">
								<button onclick={() => saveHighlightNote(h.id)} class="text-xs text-muted hover:text-light">Save</button>
								<button onclick={() => deleteHighlight(h.id)} class="text-xs text-muted hover:text-light">Remove</button>
								<button onclick={() => (activeHighlight = null)} class="text-xs text-muted hover:text-light">Close</button>
							</div>
						{:else}
							{#if h.note}
								<p class="mt-1 text-xs text-muted">{h.note}</p>
							{/if}
							<button
								onclick={() => { activeHighlight = h; highlightNoteText = h.note; }}
								class="mt-1 text-xs text-muted hover:text-light"
							>
								{h.note ? 'Edit note' : 'Add note'}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet chatContent()}
	{#if !inActiveView}
		<!-- Conversation list -->
		<div class="flex-1 overflow-y-auto p-4">
			<button
				onclick={() => startNewChat()}
				class="mb-4 w-full border border-rule px-3 py-2 text-xs text-light transition-colors hover:border-muted hover:text-bright uppercase"
			>
				New conversation
			</button>
			{#if conversations.length > 0}
				<div class="space-y-2">
					{#each conversations as conv (conv.id)}
						<div class="flex items-start gap-2 border-b border-rule py-3">
							<button
								onclick={() => loadConversation(conv.id)}
								class="flex-1 text-left"
							>
								<p class="text-sm text-light">{conv.title || 'Untitled'}</p>
								<p class="mt-0.5 text-xs text-muted">{new Date(conv.created_at).toLocaleDateString()}</p>
							</button>
							<button
								onclick={() => deleteConversation(conv.id)}
								class="shrink-0 text-xs text-muted hover:text-light"
							>
								&times;
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-muted">No conversations yet. Select text and click "Explain" to start, or create a new conversation.</p>
			{/if}
		</div>
	{:else}
		<!-- Active conversation -->
		<div bind:this={chatEl} class="flex-1 overflow-y-auto p-4">
			{#if conversationLoading && chatMessages.length === 0}
				<div class="space-y-3">
					{#each [80, 60, 90, 70] as w}
						<div class="h-3 animate-pulse rounded bg-rule/40" style="width: {w}%"></div>
					{/each}
				</div>
			{/if}
			{#each chatMessages as msg, i (i)}
				{#if msg.role !== 'assistant' || msg.content.length > 0}
					<ChatMessage role={msg.role} content={msg.content} />
				{/if}
			{/each}
			{#if chatLoading}
				<div class="mb-4">
					<div class="inline-flex items-center gap-2 rounded-lg bg-dark px-4 py-3">
						<span class="text-xs text-muted">Thinking</span>
						<div class="flex gap-1">
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></span>
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></span>
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input -->
		<form onsubmit={(e) => { e.preventDefault(); sendChat(); }} class="border-t border-rule p-3">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={chatInput}
					placeholder="Ask about this reading..."
					disabled={chatLoading || chatStreaming}
					class="flex-1 border border-rule bg-dark px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-muted disabled:opacity-50"
				/>
				{#if chatStreaming}
					<button
						type="button"
						onclick={abortChat}
						class="border border-rule px-3 py-2 text-xs text-light transition-colors hover:border-muted hover:bg-rule/30 uppercase"
					>
						Stop
					</button>
				{:else}
					<button
						type="submit"
						disabled={!chatInput.trim() || chatLoading}
						class="border border-rule px-3 py-2 text-xs text-muted transition-colors hover:border-muted hover:text-light uppercase disabled:opacity-30"
					>
						Send
					</button>
				{/if}
			</div>
		</form>
	{/if}
{/snippet}
