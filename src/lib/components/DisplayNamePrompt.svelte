<script lang="ts">
	// Asked once, the first time a student shares or replies: the name that
	// classmates will see. Saved through /api/profile; the caller reloads its
	// data (or bumps its local flag) in onDone and then finishes the action
	// the student started.
	interface Props {
		suggested: string;
		/** Verb phrase for the prompt, e.g. "share this highlight". */
		what: string;
		onDone: () => void | Promise<void>;
		onCancel: () => void;
	}
	let { suggested, what, onDone, onCancel }: Props = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(suggested);
	let saving = $state(false);
	let err = $state<string | null>(null);

	async function save() {
		const trimmed = name.replace(/\s+/g, ' ').trim();
		if (!trimmed || saving) return;
		saving = true;
		err = null;
		try {
			const res = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: trimmed })
			});
			if (!res.ok) {
				err = (await res.text().catch(() => '')) || `Could not save (${res.status})`;
				return;
			}
			await onDone();
		} catch {
			err = 'Could not save (network)';
		} finally {
			saving = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center"
	role="presentation"
>
	<button
		type="button"
		class="absolute inset-0 cursor-default"
		aria-label="Dismiss"
		onclick={onCancel}
	></button>
	<div
		class="relative w-full max-w-sm rounded-2xl border border-rule bg-dark p-5 shadow-lg"
		role="dialog"
		aria-labelledby="display-name-title"
	>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<p id="display-name-title" class="font-serif text-base text-bright">
				How should the class know you?
			</p>
			<p class="mt-1 text-xs leading-relaxed text-muted">
				To {what}, pick the name that appears next to what you share. You can change it later from
				the Commons.
			</p>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={name}
				autofocus
				maxlength="40"
				autocomplete="nickname"
				class="mt-4 w-full border border-rule bg-black/40 px-3 py-2 font-serif text-sm text-white outline-none focus:border-muted"
			/>
			{#if err}<p class="mt-2 text-xs text-red-300">{err}</p>{/if}
			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={onCancel}
					class="rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-light"
					>Not now</button
				>
				<button
					type="submit"
					disabled={saving || !name.trim()}
					class="rounded-full border border-muted px-4 py-1.5 text-xs text-bright transition-colors hover:bg-rule/50 disabled:opacity-40"
					>{saving ? 'Saving…' : 'Continue'}</button
				>
			</div>
		</form>
	</div>
</div>
