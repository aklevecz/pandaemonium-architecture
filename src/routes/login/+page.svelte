<script lang="ts">
	import { page } from '$app/state';

	let email = $state('');
	let errorMsg = $state('');
	let loading = $state(false);
	let sent = $state(false);

	// Arrived here from a dead link rather than by choice.
	const expired = $derived(page.url.searchParams.has('expired'));

	async function submit() {
		errorMsg = '';
		loading = true;
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'request', email })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				errorMsg = data.message || `Error ${res.status}`;
				return;
			}
			sent = true;
		} catch {
			errorMsg = 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto max-w-sm px-6 pt-24">
	{#if sent}
		<h1 class="font-serif text-3xl text-bright">Check your email</h1>
		<p class="mt-3 text-sm leading-relaxed text-gray">
			If <span class="text-light">{email}</span> can sign in, a link is on its way. It works once
			and expires in 15 minutes.
		</p>
		<button
			onclick={() => {
				sent = false;
				email = '';
			}}
			class="mt-6 text-xs text-muted transition-colors hover:text-light"
		>
			Use a different address
		</button>
	{:else}
		<h1 class="font-serif text-3xl text-bright">Sign in</h1>
		<p class="mt-2 text-xs leading-relaxed text-muted">
			Enter your email and we'll send a sign-in link. No password needed — if you don't have an
			account yet, one is created when you follow it.
		</p>

		{#if expired}
			<p class="mt-4 border border-rule bg-dark px-3 py-2 text-xs text-gray">
				That link had already been used or expired. Request a new one.
			</p>
		{/if}

		<form
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
			class="mt-8 space-y-4"
		>
			<div>
				<label for="email" class="block text-xs text-muted uppercase">Email</label>
				<input
					id="email"
					type="email"
					autocomplete="email"
					bind:value={email}
					required
					class="mt-1 w-full border border-rule bg-dark px-3 py-2 text-sm text-white outline-none focus:border-muted"
				/>
			</div>

			{#if errorMsg}
				<p class="text-xs text-red-400">{errorMsg}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full border border-rule bg-dark px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright disabled:opacity-50"
			>
				{loading ? 'Sending…' : 'Email me a link'}
			</button>
		</form>
	{/if}
</div>
