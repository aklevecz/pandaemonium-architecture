<script lang="ts">
	import { goto } from '$app/navigation';

	let mode: 'login' | 'signup' = $state('login');
	let email = $state('');
	let password = $state('');
	let errorMsg = $state('');
	let loading = $state(false);

	async function submit() {
		errorMsg = '';
		loading = true;
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: mode, email, password })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				errorMsg = data.message || `Error ${res.status}`;
				return;
			}
			goto('/');
		} catch {
			errorMsg = 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto max-w-sm px-6 pt-24">
	<h1 class="font-serif text-3xl text-bright">
		{mode === 'login' ? 'Log in' : 'Sign up'}
	</h1>
	<p class="mt-2 text-xs text-muted">
		{mode === 'login' ? 'Log in to save notes on readings.' : 'Create an account to save notes.'}
	</p>

	<form onsubmit={(e) => { e.preventDefault(); submit(); }} class="mt-8 space-y-4">
		<div>
			<label for="email" class="block text-xs text-muted uppercase">Email</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				class="mt-1 w-full border border-rule bg-dark px-3 py-2 text-sm text-white outline-none focus:border-muted"
			/>
		</div>
		<div>
			<label for="password" class="block text-xs text-muted uppercase">Password</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				minlength="6"
				class="mt-1 w-full border border-rule bg-dark px-3 py-2 text-sm text-white outline-none focus:border-muted"
			/>
		</div>

		{#if errorMsg}
			<p class="text-xs text-red-400">{errorMsg}</p>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="w-full border border-rule bg-dark px-4 py-2 text-xs tracking-wide text-light transition-colors hover:border-muted hover:text-bright uppercase disabled:opacity-50"
		>
			{loading ? '...' : mode === 'login' ? 'Log in' : 'Sign up'}
		</button>
	</form>

	<p class="mt-6 text-xs text-muted">
		{#if mode === 'login'}
			No account?
			<button onclick={() => (mode = 'signup')} class="text-light hover:text-bright">
				Sign up
			</button>
		{:else}
			Have an account?
			<button onclick={() => (mode = 'login')} class="text-light hover:text-bright">
				Log in
			</button>
		{/if}
	</p>
</div>
