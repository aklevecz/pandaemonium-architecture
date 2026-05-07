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

	interface Props {
		notes: Note[];
		highlights: Highlight[];
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
	}

	const {
		notes,
		highlights,
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
		onSetActiveHighlight
	}: Props = $props();

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
		<div class="fixed inset-0 z-40 overflow-y-auto bg-black p-4 pt-14">
			<div class="flex items-center justify-between">
				<p class="text-xs tracking-widest text-muted uppercase">Notes & Highlights</p>
				<button onclick={onClose} class="px-2 py-1 text-sm text-muted hover:text-light">&times; Close</button>
			</div>
			{@render body()}
		</div>
	{:else}
		<aside class="fixed top-[57px] right-0 bottom-0 w-72 overflow-y-auto border-l border-rule bg-black p-5">
			<div class="flex items-center justify-between">
				<p class="text-xs tracking-widest text-muted uppercase">Notes & Highlights</p>
				<button onclick={onClose} class="text-sm text-muted hover:text-light">&times;</button>
			</div>
			{@render body()}
		</aside>
	{/if}
{/if}

{#snippet body()}
	<form onsubmit={(e) => { e.preventDefault(); submitNewNote(); }} class="mt-4">
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
		</div>
	{/if}

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
								<button onclick={() => onSaveHighlightNote(h.id, highlightNoteText)} class="text-xs text-muted hover:text-light">Save</button>
								<button onclick={() => onDeleteHighlight(h.id)} class="text-xs text-muted hover:text-light">Remove</button>
								<button onclick={onClearActiveHighlight} class="text-xs text-muted hover:text-light">Close</button>
							</div>
						{:else}
							{#if h.note}
								<p class="mt-1 text-xs text-muted">{h.note}</p>
							{/if}
							<div class="mt-1 flex gap-3">
								<button
									onclick={() => onSetActiveHighlight(h)}
									class="text-xs text-muted hover:text-light"
								>
									{h.note ? 'Edit note' : 'Add note'}
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
		</div>
	{/if}
{/snippet}
