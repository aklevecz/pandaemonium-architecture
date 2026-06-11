<script lang="ts">
	import { relTime } from '$lib/utils/time';

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
	interface Vocab {
		id: number;
		word: string;
		definition: string;
		context: string | null;
		created_at: string;
	}

	interface Props {
		notes: Note[];
		highlights: Highlight[];
		vocab: Vocab[];
		isMobile: boolean;
		open: boolean;
		activeHighlight: Highlight | null;
		onClose: () => void;
		onAddNote: (content: string) => Promise<void>;
		onUpdateNote: (id: number, content: string) => Promise<void>;
		onDeleteNote: (id: number) => Promise<void>;
		onSaveHighlightNote: (id: number, note: string) => Promise<void>;
		onDeleteHighlight: (id: number) => Promise<void>;
		onClearActiveHighlight: () => void;
		onSetActiveHighlight: (h: Highlight) => void;
		onExtendHighlight: (h: Highlight) => void;
		onJumpToHighlight: (h: Highlight) => void;
		onDeleteVocab: (id: number) => Promise<void>;
		// Position of a highlight's text within the rendered reading, for
		// reading-order sort. Returns MAX_SAFE_INTEGER when not locatable.
		getDocPosition?: (h: Highlight) => number;
	}

	const {
		notes,
		highlights,
		vocab,
		isMobile,
		open,
		activeHighlight,
		onClose,
		onAddNote,
		onUpdateNote,
		onDeleteNote,
		onSaveHighlightNote,
		onDeleteHighlight,
		onClearActiveHighlight,
		onSetActiveHighlight,
		onExtendHighlight,
		onJumpToHighlight,
		onDeleteVocab,
		getDocPosition
	}: Props = $props();

	// --- Tabs ------------------------------------------------------------------
	// One category at a time so a busy reading doesn't become an endless scroll.
	type Tab = 'highlights' | 'vocab' | 'notes';
	const TABS: { key: Tab; label: string }[] = [
		{ key: 'highlights', label: 'Highlights' },
		{ key: 'vocab', label: 'Vocab' },
		{ key: 'notes', label: 'Notes' }
	];
	const TAB_KEY = 'notes-panel-tab-v1';
	let tab = $state<Tab>(
		typeof localStorage !== 'undefined' ? ((localStorage.getItem(TAB_KEY) as Tab) ?? 'highlights') : 'highlights'
	);
	function tabCount(k: Tab): number {
		return k === 'highlights' ? highlights.length : k === 'vocab' ? vocab.length : notes.length;
	}
	function setTab(k: Tab) {
		tab = k;
		filter = '';
		cancelDelete();
		if (typeof localStorage !== 'undefined') localStorage.setItem(TAB_KEY, k);
		requestAnimationFrame(() => {
			if (scrollEl) scrollEl.scrollTop = 0;
		});
	}

	// When a highlight is activated for note-editing from the reading, jump to
	// its tab so the editor is visible.
	$effect(() => {
		if (activeHighlight) tab = 'highlights';
	});

	// --- Filter (per tab; resets on tab switch) ---------------------------------
	let filter = $state('');
	const q = $derived(filter.trim().toLowerCase());
	function matches(...fields: (string | null | undefined)[]): boolean {
		if (!q) return true;
		return fields.some((f) => (f ?? '').toLowerCase().includes(q));
	}

	// --- Highlight sort: reading order vs newest --------------------------------
	type HlSort = 'position' | 'newest';
	const HL_SORT_KEY = 'notes-panel-hl-sort-v1';
	let hlSort = $state<HlSort>(
		typeof localStorage !== 'undefined'
			? ((localStorage.getItem(HL_SORT_KEY) as HlSort) ?? 'position')
			: 'position'
	);
	function setHlSort(s: HlSort) {
		hlSort = s;
		if (typeof localStorage !== 'undefined') localStorage.setItem(HL_SORT_KEY, s);
	}
	const sortedHighlights = $derived.by(() => {
		const list = highlights.filter((h) => matches(h.text, h.note));
		if (hlSort === 'newest' || !getDocPosition) {
			// API returns created ASC; newest = reverse.
			return hlSort === 'newest' ? [...list].reverse() : list;
		}
		const pos = new Map<number, number>(list.map((h) => [h.id, getDocPosition(h)]));
		return [...list].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
	});

	const filteredVocab = $derived(vocab.filter((v) => matches(v.word, v.definition, v.context)));
	const filteredNotes = $derived(notes.filter((n) => matches(n.content)));

	const SNIPPET_PREVIEW = 200;
	let expandedHighlights = $state(new Set<number>());
	function toggleExpand(id: number) {
		if (expandedHighlights.has(id)) expandedHighlights.delete(id);
		else expandedHighlights.add(id);
		expandedHighlights = expandedHighlights; // svelte reactivity nudge
	}

	// --- Two-step delete (shared across tabs) ------------------------------------
	// One armed target at a time, disarms itself after a beat.
	let confirmDelete: { kind: 'highlight' | 'vocab' | 'note'; id: number } | null = $state(null);
	let confirmTimer: ReturnType<typeof setTimeout> | null = null;
	function requestDelete(kind: NonNullable<typeof confirmDelete>['kind'], id: number) {
		confirmDelete = { kind, id };
		if (confirmTimer) clearTimeout(confirmTimer);
		confirmTimer = setTimeout(() => (confirmDelete = null), 4000);
	}
	function cancelDelete() {
		if (confirmTimer) clearTimeout(confirmTimer);
		confirmTimer = null;
		confirmDelete = null;
	}
	function isArmed(kind: NonNullable<typeof confirmDelete>['kind'], id: number): boolean {
		return confirmDelete?.kind === kind && confirmDelete?.id === id;
	}
	async function confirmAndDelete() {
		const target = confirmDelete;
		cancelDelete();
		if (!target) return;
		if (target.kind === 'highlight') await onDeleteHighlight(target.id);
		else if (target.kind === 'vocab') await onDeleteVocab(target.id);
		else await onDeleteNote(target.id);
	}

	// --- Resizable desktop panel --------------------------------------------------
	const MIN_WIDTH = 272;
	const WIDTH_KEY = 'notes-width-v1';
	function loadWidth(): number {
		if (typeof localStorage === 'undefined') return 288;
		const v = Number(localStorage.getItem(WIDTH_KEY));
		return Number.isFinite(v) && v >= MIN_WIDTH ? v : 288;
	}
	let panelWidth = $state(loadWidth());
	let resizing = $state(false);
	function maxWidth(): number {
		return typeof window === 'undefined' ? 560 : Math.max(MIN_WIDTH, Math.min(560, window.innerWidth - 360));
	}
	function startResize(e: PointerEvent) {
		e.preventDefault();
		resizing = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onResize(e: PointerEvent) {
		if (!resizing) return;
		panelWidth = Math.min(maxWidth(), Math.max(MIN_WIDTH, window.innerWidth - e.clientX));
	}
	function stopResize(e: PointerEvent) {
		if (!resizing) return;
		resizing = false;
		(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
		if (typeof localStorage !== 'undefined') localStorage.setItem(WIDTH_KEY, String(panelWidth));
	}

	// Persist scroll position per (reading, tab) so reopening returns you to
	// where you were within that tab.
	let scrollEl: HTMLElement | undefined = $state();
	const SCROLL_KEY = () =>
		typeof window === 'undefined' ? null : `notes-panel-scroll:${window.location.pathname}:${tab}`;

	function saveScroll() {
		const key = SCROLL_KEY();
		if (!key || !scrollEl) return;
		try {
			sessionStorage.setItem(key, String(scrollEl.scrollTop));
		} catch {}
	}

	$effect(() => {
		// Restore saved scrollTop when (re)opened or when the tab changes.
		void tab;
		if (!open || !scrollEl) return;
		const key = SCROLL_KEY();
		if (!key) return;
		const saved = Number(sessionStorage.getItem(key) ?? '0');
		requestAnimationFrame(() => {
			if (scrollEl) scrollEl.scrollTop = saved;
		});
	});

	let newNote = $state('');
	let editingId: number | null = $state(null);
	let editContent = $state('');
	let highlightNoteText = $state('');

	$effect(() => {
		// When parent activates a different highlight, sync the editor textarea.
		highlightNoteText = activeHighlight?.note ?? '';
	});

	async function submitNewNote() {
		if (!newNote.trim()) return;
		await onAddNote(newNote);
		newNote = '';
	}

	async function submitEdit(id: number) {
		if (!editContent.trim()) return;
		await onUpdateNote(id, editContent);
		editingId = null;
	}

	// --- Escape: step back one layer, then close ---------------------------------
	function handleKeydown(e: KeyboardEvent) {
		if (!open || e.key !== 'Escape' || e.defaultPrevented) return;
		if (confirmDelete !== null) {
			cancelDelete();
			return;
		}
		if (editingId !== null) {
			editingId = null;
			return;
		}
		if (activeHighlight) {
			onClearActiveHighlight();
			return;
		}
		if (filter) {
			filter = '';
			return;
		}
		onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	{#if isMobile}
		<!-- z-[60] sits above the sticky nav (z-50). -->
		<div class="fixed inset-0 z-[60] flex flex-col bg-black">
			{@render header()}
			<div bind:this={scrollEl} onscroll={saveScroll} class="flex-1 overflow-y-auto px-4 pb-8">
				{@render body()}
			</div>
		</div>
	{:else}
		<aside
			class="fixed top-[57px] right-0 bottom-0 flex flex-col border-l border-rule bg-black {resizing
				? 'select-none'
				: ''}"
			style="width: {panelWidth}px"
		>
			<div
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize annotations panel"
				onpointerdown={startResize}
				onpointermove={onResize}
				onpointerup={stopResize}
				class="group absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none"
			>
				<div
					class="absolute inset-y-0 left-1 w-px transition-colors {resizing
						? 'bg-muted'
						: 'bg-transparent group-hover:bg-rule'}"
				></div>
			</div>
			{@render header()}
			<div bind:this={scrollEl} onscroll={saveScroll} class="flex-1 overflow-y-auto px-5 pb-8">
				{@render body()}
			</div>
		</aside>
	{/if}
{/if}

{#snippet header()}
	<div class="flex-none border-b border-rule">
		<div class="flex items-center justify-between px-4 pt-3 sm:px-5">
			<p class="text-xs tracking-widest text-muted uppercase">Annotations</p>
			<button onclick={onClose} class="text-sm text-muted hover:text-light" aria-label="Close panel">
				&times;{#if isMobile}<span class="ml-1">Close</span>{/if}
			</button>
		</div>
		<div class="flex gap-1 overflow-x-auto px-3 py-2 sm:px-4" style="scrollbar-width: none;">
			{#each TABS as t (t.key)}
				{@const n = tabCount(t.key)}
				<button
					type="button"
					onclick={() => setTab(t.key)}
					class="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] tracking-wide whitespace-nowrap uppercase transition-colors {tab ===
					t.key
						? 'bg-rule/60 text-bright'
						: 'text-muted hover:text-light'}"
				>
					{t.label}
					{#if n > 0}
						<span
							class="rounded-full px-1 text-[10px] tabular-nums {tab === t.key
								? 'bg-bright/20 text-bright'
								: 'bg-rule/50 text-muted'}">{n}</span
						>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet filterBox(placeholder: string)}
	<input
		type="search"
		bind:value={filter}
		{placeholder}
		class="mb-3 w-full border border-rule bg-dark px-3 py-1.5 text-xs text-light outline-none placeholder:text-muted focus:border-muted"
	/>
{/snippet}

{#snippet deleteControls(kind: 'highlight' | 'vocab' | 'note', id: number)}
	{#if isArmed(kind, id)}
		<button onclick={confirmAndDelete} class="text-xs text-red-400 hover:text-red-300">Delete?</button>
		<button onclick={cancelDelete} class="text-xs text-muted hover:text-light">Cancel</button>
	{:else}
		<button onclick={() => requestDelete(kind, id)} class="text-xs text-muted hover:text-light">Delete</button>
	{/if}
{/snippet}

{#snippet body()}
	<div class="pt-4">
		{#if tab === 'highlights'}
			{#if highlights.length === 0}
				<p class="text-xs text-muted">
					Select text in the reading and tap <span class="text-light">Highlight</span> to save a passage
					here.
				</p>
			{:else}
				{#if highlights.length > 5}
					{@render filterBox('Filter highlights…')}
				{/if}
				{#if highlights.length > 1 && getDocPosition}
					<div class="mb-3 flex items-center gap-1 text-[11px]">
						<span class="text-muted">Sort:</span>
						<button
							type="button"
							onclick={() => setHlSort('position')}
							class="rounded px-1.5 py-0.5 transition-colors {hlSort === 'position'
								? 'bg-rule/50 text-bright'
								: 'text-muted hover:text-light'}">Reading order</button
						>
						<button
							type="button"
							onclick={() => setHlSort('newest')}
							class="rounded px-1.5 py-0.5 transition-colors {hlSort === 'newest'
								? 'bg-rule/50 text-bright'
								: 'text-muted hover:text-light'}">Newest</button
						>
					</div>
				{/if}
				{#if sortedHighlights.length === 0}
					<p class="text-xs text-muted">No highlights match &ldquo;{filter.trim()}&rdquo;.</p>
				{:else}
					<div class="space-y-3">
						{#each sortedHighlights as h (h.id)}
							{@const expanded = expandedHighlights.has(h.id)}
							{@const long = h.text.length > SNIPPET_PREVIEW}
							<div
								class="border-l-2 py-1 pl-3 {activeHighlight?.id === h.id
									? 'border-yellow-400'
									: 'border-yellow-500/30'}"
							>
								<button
									type="button"
									onclick={() => onJumpToHighlight(h)}
									class="block w-full cursor-pointer text-left font-serif text-xs leading-relaxed text-light italic transition-colors hover:text-bright"
									title="Jump to this passage in the reading"
								>
									&ldquo;{expanded || !long ? h.text : h.text.slice(0, SNIPPET_PREVIEW) + '…'}&rdquo;
								</button>
								{#if long}
									<button
										type="button"
										onclick={() => toggleExpand(h.id)}
										class="mt-1 text-xs text-muted hover:text-light"
									>
										{expanded ? 'Show less' : 'Show more'}
									</button>
								{/if}
								{#if activeHighlight?.id === h.id}
									<textarea
										bind:value={highlightNoteText}
										placeholder="Add a note..."
										rows="2"
										class="mt-2 w-full resize-none border border-rule bg-dark px-2 py-1 text-xs text-white outline-none placeholder:text-muted focus:border-muted"
									></textarea>
									<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
										<button onclick={() => onSaveHighlightNote(h.id, highlightNoteText)} class="text-xs text-muted hover:text-light">Save</button>
										<button onclick={() => onDeleteHighlight(h.id)} class="text-xs text-muted hover:text-light">Remove</button>
										<button onclick={onClearActiveHighlight} class="text-xs text-muted hover:text-light">Close</button>
									</div>
								{:else}
									{#if h.note}
										<p class="mt-1 text-xs text-muted">{h.note}</p>
									{/if}
									<div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
										<button onclick={() => onJumpToHighlight(h)} class="text-xs text-muted hover:text-light">Jump to</button>
										<button onclick={() => onSetActiveHighlight(h)} class="text-xs text-muted hover:text-light">{h.note ? 'Edit note' : 'Add note'}</button>
										<button onclick={() => onExtendHighlight(h)} class="text-xs text-muted hover:text-light">Adjust</button>
										{@render deleteControls('highlight', h.id)}
										<span class="text-[10px] text-muted/70">{relTime(h.created_at)}</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		{:else if tab === 'vocab'}
			{#if vocab.length === 0}
				<p class="text-xs text-muted">
					Select a word and tap <span class="text-light">Define</span> to save it here for review.
				</p>
			{:else}
				{#if vocab.length > 5}
					{@render filterBox('Filter vocab…')}
				{/if}
				{#if filteredVocab.length === 0}
					<p class="text-xs text-muted">No vocab matches &ldquo;{filter.trim()}&rdquo;.</p>
				{:else}
					<div class="space-y-3">
						{#each filteredVocab as v (v.id)}
							<div class="border-l-2 border-blue-500/30 py-1 pl-3">
								<div class="flex items-baseline justify-between gap-2">
									<p class="font-serif text-sm text-bright">{v.word}</p>
									<div class="flex shrink-0 items-baseline gap-2">
										{@render deleteControls('vocab', v.id)}
									</div>
								</div>
								<p class="mt-1 font-serif text-xs leading-relaxed text-gray">{v.definition}</p>
								{#if v.context}
									<p class="mt-1 line-clamp-2 font-serif text-xs leading-relaxed text-muted italic">
										&ldquo;{v.context}&rdquo;
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		{:else if tab === 'notes'}
			<form onsubmit={(e) => { e.preventDefault(); submitNewNote(); }}>
				<textarea
					bind:value={newNote}
					placeholder="Add a note about this reading…"
					rows="3"
					onkeydown={(e) => {
						if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
							e.preventDefault();
							submitNewNote();
						}
					}}
					class="w-full resize-none border border-rule bg-dark px-3 py-2 font-serif text-sm text-white outline-none placeholder:text-muted focus:border-muted"
				></textarea>
				<button
					type="submit"
					disabled={!newNote.trim()}
					class="mt-2 border border-rule px-3 py-1 text-xs text-muted uppercase transition-colors hover:border-muted hover:text-light disabled:opacity-30"
				>
					Save
				</button>
			</form>

			{#if notes.length > 5}
				<div class="mt-4">
					{@render filterBox('Filter notes…')}
				</div>
			{/if}
			{#if notes.length > 0}
				{#if filteredNotes.length === 0}
					<p class="mt-4 text-xs text-muted">No notes match &ldquo;{filter.trim()}&rdquo;.</p>
				{:else}
					<div class="mt-4 divide-y divide-rule">
						{#each filteredNotes as note (note.id)}
							<div class="py-3">
								{#if editingId === note.id}
									<textarea
										bind:value={editContent}
										rows="3"
										onkeydown={(e) => {
											if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
												e.preventDefault();
												submitEdit(note.id);
											}
										}}
										class="w-full resize-none border border-rule bg-dark px-2 py-1 font-serif text-sm text-white outline-none focus:border-muted"
									></textarea>
									<div class="mt-1 flex gap-2">
										<button onclick={() => submitEdit(note.id)} class="text-xs text-muted hover:text-light">Save</button>
										<button onclick={() => (editingId = null)} class="text-xs text-muted hover:text-light">Cancel</button>
									</div>
								{:else}
									<p class="font-serif text-sm whitespace-pre-wrap text-gray">{note.content}</p>
									<div class="mt-1 flex items-baseline gap-2">
										<button onclick={() => { editingId = note.id; editContent = note.content; }} class="text-xs text-muted hover:text-light">Edit</button>
										{@render deleteControls('note', note.id)}
										<span class="text-xs text-muted/70">{relTime(note.updated_at)}</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<p class="mt-4 text-xs text-muted">No notes yet for this reading.</p>
			{/if}
		{/if}
	</div>
{/snippet}
