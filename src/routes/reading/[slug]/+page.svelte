<script lang="ts">
	import { getPdfUrl } from '$lib/data/syllabus';
	import { page } from '$app/state';
	import { browser } from '$app/environment';

	let { data } = $props();

	interface Note {
		id: number;
		content: string;
		created_at: string;
		updated_at: string;
	}

	let notes: Note[] = $state([]);
	let newNote = $state('');
	let editingId: number | null = $state(null);
	let editContent = $state('');
	let loadingNotes = $state(false);
	let showNotes = $state(false);

	const user = $derived(data.user);

	async function fetchNotes() {
		if (!user) return;
		loadingNotes = true;
		try {
			const res = await fetch(`/api/notes?slug=${encodeURIComponent(data.slug)}`);
			if (res.ok) {
				notes = await res.json();
			}
		} finally {
			loadingNotes = false;
		}
	}

	async function addNote() {
		if (!newNote.trim()) return;
		const res = await fetch('/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: data.slug, content: newNote })
		});
		if (res.ok) {
			newNote = '';
			await fetchNotes();
		}
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

	function startEdit(note: Note) {
		editingId = note.id;
		editContent = note.content;
	}

	function toggleNotes() {
		showNotes = !showNotes;
		if (showNotes && notes.length === 0 && user) {
			fetchNotes();
		}
	}

	$effect(() => {
		if (browser && user) {
			fetchNotes();
		}
	});
</script>

<article class="mx-auto max-w-3xl px-6">
	<div class="pt-10">
		{#if data.weekNumber}
			<a
				href="/week/{data.weekNumber}"
				class="text-xs text-muted transition-colors hover:text-white uppercase"
			>
				&larr; Week {String(data.weekNumber).padStart(2, '0')}
			</a>
		{:else}
			<a
				href="/"
				class="text-xs text-muted transition-colors hover:text-white uppercase"
			>
				&larr; Back
			</a>
		{/if}
	</div>

	<header class="pb-12 pt-10">
		<p class="text-xs text-muted">{data.author}</p>
		<h1 class="mt-3 font-serif text-3xl font-normal leading-tight text-bright sm:text-4xl">
			{data.title}
		</h1>
		<div class="mt-4 flex items-center gap-4">
			{#if data.weekNumber}
				<span class="text-xs text-muted">
					Week {String(data.weekNumber).padStart(2, '0')} &mdash; {data.weekTitle}
					{#if data.isAdditional}
						&mdash; Additional Reading
					{/if}
				</span>
			{:else if data.isIntroductory}
				<span class="text-xs text-muted">Introductory Reading</span>
			{/if}
			<a
				href={getPdfUrl(data.pdf)}
				target="_blank"
				rel="noopener"
				class="text-xs text-rule transition-colors hover:text-muted"
			>
				PDF &rarr;
			</a>
			{#if user}
				<button
					onclick={toggleNotes}
					class="text-xs text-rule transition-colors hover:text-muted"
				>
					Notes {notes.length > 0 ? `(${notes.length})` : ''}
				</button>
			{/if}
		</div>
	</header>

	<!-- Notes panel -->
	{#if showNotes && user}
		<div class="mb-8 border border-rule p-6">
			<p class="text-xs tracking-widest text-muted uppercase">Your Notes</p>

			<form onsubmit={(e) => { e.preventDefault(); addNote(); }} class="mt-4">
				<textarea
					bind:value={newNote}
					placeholder="Add a note..."
					rows="3"
					class="w-full resize-none border border-rule bg-dark px-3 py-2 font-serif text-sm text-white outline-none placeholder:text-rule focus:border-muted"
				></textarea>
				<button
					type="submit"
					disabled={!newNote.trim()}
					class="mt-2 border border-rule px-3 py-1 text-xs text-muted transition-colors hover:border-muted hover:text-light uppercase disabled:opacity-30"
				>
					Save
				</button>
			</form>

			{#if loadingNotes}
				<p class="mt-4 text-xs text-muted">Loading...</p>
			{:else if notes.length > 0}
				<div class="mt-6 divide-y divide-rule">
					{#each notes as note (note.id)}
						<div class="py-4">
							{#if editingId === note.id}
								<textarea
									bind:value={editContent}
									rows="3"
									class="w-full resize-none border border-rule bg-dark px-3 py-2 font-serif text-sm text-white outline-none focus:border-muted"
								></textarea>
								<div class="mt-2 flex gap-2">
									<button
										onclick={() => updateNote(note.id)}
										class="text-xs text-muted hover:text-light uppercase"
									>
										Save
									</button>
									<button
										onclick={() => (editingId = null)}
										class="text-xs text-rule hover:text-muted uppercase"
									>
										Cancel
									</button>
								</div>
							{:else}
								<p class="whitespace-pre-wrap font-serif text-sm text-gray">
									{note.content}
								</p>
								<div class="mt-2 flex gap-3">
									<button
										onclick={() => startEdit(note)}
										class="text-xs text-rule transition-colors hover:text-muted"
									>
										Edit
									</button>
									<button
										onclick={() => deleteNote(note.id)}
										class="text-xs text-rule transition-colors hover:text-muted"
									>
										Delete
									</button>
									<span class="text-xs text-rule">
										{new Date(note.updated_at).toLocaleDateString()}
									</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="h-px bg-rule"></div>

	<div class="prose py-12">
		{@html data.content}
	</div>
</article>
