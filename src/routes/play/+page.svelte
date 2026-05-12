<script lang="ts">
	const modes = [
		{
			slug: 'debate',
			name: 'Diffraction Debate',
			tagline: 'Two thinkers from the corpus argue with each other — and with you.',
			body: 'Pick any two named persons from the corpus. Set a topic or let the tension surface on its own. Claude stages a debate, each speaker grounded in their corpus passages and bio. You moderate.',
			live: true
		},
		{
			slug: 'pin-the-quote',
			name: 'Pin the Quote',
			tagline: 'Find the real passage among the paraphrases.',
			body: 'Coming soon.',
			live: false
		},
		{
			slug: 'theory-adventure',
			name: 'Theory Adventure',
			tagline: 'Step into a scenario; choose whose theoretical frame to see it through.',
			body: 'Coming soon.',
			live: false
		}
	];
</script>

<svelte:head>
	<title>Play · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pb-8 pt-12">
		<a href="/" class="text-xs text-muted transition-colors hover:text-white uppercase">&larr; Back</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Play</h1>
		<p class="mt-2 text-xs text-muted">
			Interactive ways to explore the corpus. Not assessment — exploration.
		</p>
	</header>

	<div class="space-y-6 pb-24">
		{#each modes as m (m.slug)}
			{#if m.live}
				<a href="/play/{m.slug}" class="group block rounded border border-rule p-5 no-underline transition-colors hover:border-muted hover:bg-rule/20">
					<p class="text-[10px] uppercase tracking-widest text-muted">Live</p>
					<h2 class="mt-1 font-serif text-2xl text-light transition-colors group-hover:text-bright">{m.name}</h2>
					<p class="mt-1 font-serif text-sm text-muted">{m.tagline}</p>
					<p class="mt-3 font-serif text-sm leading-relaxed text-gray">{m.body}</p>
				</a>
			{:else}
				<div class="rounded border border-rule/40 p-5 opacity-60">
					<p class="text-[10px] uppercase tracking-widest text-muted">Soon</p>
					<h2 class="mt-1 font-serif text-2xl text-muted">{m.name}</h2>
					<p class="mt-1 font-serif text-sm text-muted">{m.tagline}</p>
				</div>
			{/if}
		{/each}
	</div>
</div>
