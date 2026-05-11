<script lang="ts">
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
		onDeleteVocab
	}: Props = $props();

	const SNIPPET_PREVIEW = 200;
	let expandedHighlights = $state(new Set<number>());
	function toggleExpand(id: number) {
		if (expandedHighlights.has(id)) expandedHighlights.delete(id);
		else expandedHighlights.add(id);
		expandedHighlights = expandedHighlights; // svelte reactivity nudge
	}

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
</script>

{#if open}
	{#if isMobile}
		<!-- z-[60] sits above the sticky nav (z-50) so the panel's own
		     close/back buttons aren't hidden behind it. -->
		<div class="fixed inset-0 z-[60] overflow-y-auto bg-black p-4">
			<div class="flex items-center justify-between border-b border-rule pb-3">
				<p class="text-xs tracking-widest text-muted uppercase">Highlights, Vocab & Notes</p>
				<button onclick={onClose} class="px-2 py-1 text-sm text-muted hover:text-light">&times; Close</button>
			</div>
			{@render body()}
		</div>
	{:else}
		<aside class="fixed top-[57px] right-0 bottom-0 w-72 overflow-y-auto border-l border-rule bg-black p-5">
			<div class="flex items-center justify-between">
				<p class="text-xs tracking-widest text-muted uppercase">Highlights, Vocab & Notes</p>
				<button onclick={onClose} class="text-sm text-muted hover:text-light">&times;</button>
			</div>
			{@render body()}
		</aside>
	{/if}
{/if}

{#snippet body()}
	<!-- Highlights first: students typically open this panel right after
	     highlighting a passage, expecting to see it. Notes (which require
	     typing) live below. Both sections always render — empty states make
	     it obvious which feature lives where. -->

	<div class="mt-4">
		<p class="text-xs text-muted uppercase">
			Highlights {highlights.length > 0 ? `(${highlights.length})` : ''}
		</p>
		{#if highlights.length === 0}
			<p class="mt-2 text-xs text-muted">
				Select text in the reading and tap <span class="text-light">Highlight</span> to save a passage here.
			</p>
		{:else}
			<div class="mt-2 space-y-3">
				{#each highlights as h (h.id)}
					{@const expanded = expandedHighlights.has(h.id)}
					{@const long = h.text.length > SNIPPET_PREVIEW}
					<div
						class="border-l-2 py-1 pl-3 {activeHighlight?.id === h.id ? 'border-yellow-400' : 'border-yellow-500/30'}"
					>
						<button
							type="button"
							onclick={() => onJumpToHighlight(h)}
							class="block w-full cursor-pointer text-left font-serif text-xs italic leading-relaxed text-light transition-colors hover:text-bright"
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
							<div class="mt-1 flex gap-2">
								<button onclick={() => onSaveHighlightNote(h.id, highlightNoteText)} class="text-xs text-muted hover:text-light">Save</button>
								<button onclick={() => onDeleteHighlight(h.id)} class="text-xs text-muted hover:text-light">Remove</button>
								<button onclick={onClearActiveHighlight} class="text-xs text-muted hover:text-light">Close</button>
							</div>
						{:else}
							{#if h.note}
								<p class="mt-1 text-xs text-muted">{h.note}</p>
							{/if}
							<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
								<button
									onclick={() => onJumpToHighlight(h)}
									class="text-xs text-muted hover:text-light"
								>
									Jump to
								</button>
								<button
									onclick={() => onSetActiveHighlight(h)}
									class="text-xs text-muted hover:text-light"
								>
									{h.note ? 'Edit note' : 'Add note'}
								</button>
								<button
									onclick={() => onExtendHighlight(h)}
									class="text-xs text-muted hover:text-light"
								>
									Extend
								</button>
								<button
									onclick={() => onDeleteHighlight(h.id)}
									class="text-xs text-muted hover:text-light"
								>
									Delete
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="mt-8 border-t border-rule pt-6">
		<p class="text-xs text-muted uppercase">
			Vocab {vocab.length > 0 ? `(${vocab.length})` : ''}
		</p>
		{#if vocab.length === 0}
			<p class="mt-2 text-xs text-muted">
				Select a word and tap <span class="text-light">Define</span> to save it here for review.
			</p>
		{:else}
			<div class="mt-2 space-y-3">
				{#each vocab as v (v.id)}
					<div class="border-l-2 border-blue-500/30 py-1 pl-3">
						<div class="flex items-baseline justify-between gap-2">
							<p class="font-serif text-sm text-bright">{v.word}</p>
							<button
								onclick={() => onDeleteVocab(v.id)}
								class="shrink-0 text-xs text-muted hover:text-light"
								aria-label="Delete vocab entry"
							>
								&times;
							</button>
						</div>
						<p class="mt-1 font-serif text-xs leading-relaxed text-gray">{v.definition}</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="mt-8 border-t border-rule pt-6">
		<p class="text-xs text-muted uppercase">
			Notes {notes.length > 0 ? `(${notes.length})` : ''}
		</p>
		<form onsubmit={(e) => { e.preventDefault(); submitNewNote(); }} class="mt-2">
			<textarea
				bind:value={newNote}
				placeholder="Add a note about this reading…"
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

		{#if notes.length > 0}
			<div class="mt-4 divide-y divide-rule">
				{#each notes as note (note.id)}
					<div class="py-3">
						{#if editingId === note.id}
							<textarea
								bind:value={editContent}
								rows="3"
								class="w-full resize-none border border-rule bg-dark px-2 py-1 font-serif text-sm text-white outline-none focus:border-muted"
							></textarea>
							<div class="mt-1 flex gap-2">
								<button onclick={() => submitEdit(note.id)} class="text-xs text-muted hover:text-light">Save</button>
								<button onclick={() => (editingId = null)} class="text-xs text-muted hover:text-light">Cancel</button>
							</div>
						{:else}
							<p class="whitespace-pre-wrap font-serif text-sm text-gray">{note.content}</p>
							<div class="mt-1 flex gap-2">
								<button onclick={() => { editingId = note.id; editContent = note.content; }} class="text-xs text-muted hover:text-light">Edit</button>
								<button onclick={() => onDeleteNote(note.id)} class="text-xs text-muted hover:text-light">Delete</button>
								<span class="text-xs text-muted">{new Date(note.updated_at).toLocaleDateString()}</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}
