<script lang="ts">
	import './layout.css';
	import { courseInfo } from '$lib/data/syllabus';
	import { browser } from '$app/environment';

	let { children } = $props();

	let dark = $state(true);

	if (browser) {
		dark = document.documentElement.classList.contains('dark');
	}

	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}
</script>

<div class="min-h-dvh bg-black">
	<nav class="sticky top-0 z-50 border-b border-rule bg-black/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
			<a href="/" class="group no-underline">
				<span class="font-serif text-sm tracking-wide text-white uppercase"
					>Pandaemonium Architecture</span
				>
			</a>
			<div class="flex items-center gap-6">
				<a
					href="/#syllabus"
					class="text-xs tracking-wide text-muted transition-colors hover:text-white uppercase"
					>Syllabus</a
				>
				<a
					href="/readings"
					class="text-xs tracking-wide text-muted transition-colors hover:text-white uppercase"
					>Index</a
				>
				<button
					onclick={toggleTheme}
					class="text-muted transition-colors hover:text-white"
					aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if dark}
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
					{/if}
				</button>
			</div>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>

	<footer class="border-t border-rule px-6 py-10">
		<div class="mx-auto max-w-4xl">
			<p class="text-xs text-muted">
				{courseInfo.title} &mdash; {courseInfo.code} &mdash; {courseInfo.semester}
			</p>
		</div>
	</footer>
</div>
