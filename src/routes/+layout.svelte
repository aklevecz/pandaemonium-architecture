<script lang="ts">
	import './layout.css';
	import { courseInfo } from '$lib/data/syllabus';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import ExperienceNav from '$lib/components/ExperienceNav.svelte';
	import { experiences } from '$lib/experience-links';

	let { children, data } = $props();

	let dark = $state(true);

	// Phones got three wrapped rows of links, eating a third of the screen on
	// every page. Below sm the links collapse into this menu instead.
	let menuOpen = $state(false);
	const loginHref = $derived(
		page.url.pathname === '/login'
			? '/login'
			: `/login?next=${encodeURIComponent(page.url.pathname + page.url.search)}`
	);
	const menuLinks = $derived([
		{ href: '/#syllabus', label: 'Syllabus' },
		{ href: '/readings', label: 'Index' },
		{ href: '/lab', label: 'Labs' },
		{ href: '/search', label: 'Search' },
		{ href: '/people', label: 'People' },
		...(data.user ? [{ href: '/notebook', label: 'Notebook' }] : []),
		...(data.isInstructor ? [{ href: '/activity', label: 'Activity' }] : []),
		{ href: '/qr', label: 'QR code' }
	]);
	// Following a link inside the menu should not leave it hanging open.
	$effect(() => {
		void page.url.pathname;
		menuOpen = false;
	});

	// Measured nav height, published as --nav-h for fixed-position UI (side
	// panels, banners) that must clear the sticky nav. The nav wraps to two
	// rows at narrower widths, so no constant works.
	let navH = $state(57);

	if (browser) {
		dark = document.documentElement.classList.contains('dark');
	}

	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	async function logout() {
		await fetch('/api/auth', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'logout' })
		});
		window.location.href = '/';
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') menuOpen = false;
	}}
/>

<div class="min-h-dvh bg-black" style="--nav-h: {navH}px">
	<nav
		bind:clientHeight={navH}
		class="sticky top-0 z-50 border-b border-rule bg-black/95 backdrop-blur-sm"
	>
		<div
			class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6 sm:py-4"
		>
			<a href="/" class="group no-underline">
				<span class="font-serif text-sm tracking-wide text-white uppercase"
					>Pandaemonium Architecture</span
				>
			</a>
			<div class="hidden min-w-0 flex-wrap items-center gap-3 sm:flex sm:gap-6">
				{#if experiences.some((item) => item.path.split('#')[0] === page.url.pathname)}
					<ExperienceNav />
				{/if}
				<a
					href="/#syllabus"
					class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
					>Syllabus</a
				>
				<a
					href="/readings"
					class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
					>Index</a
				>
				<a
					href="/lab"
					class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
					>Labs</a
				>
				<a
					href="/search"
					class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
					>Search</a
				>
				<a
					href="/people"
					class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
					>People</a
				>
				{#if data.user}
					<a
						href="/notebook"
						class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
						>Notebook</a
					>
					<a
						href="/commons"
						class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
						>Commons</a
					>
					{#if data.isInstructor}
						<a
							href="/activity"
							class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
							>Activity</a
						>
					{/if}
					<span class="hidden text-xs text-muted sm:inline">{data.user.email}</span>
					<button
						onclick={logout}
						class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
					>
						Log out
					</button>
				{:else}
					<a
						href={page.url.pathname === '/login'
							? '/login'
							: `/login?next=${encodeURIComponent(page.url.pathname + page.url.search)}`}
						class="text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
					>
						Log in
					</a>
				{/if}
				<button
					onclick={toggleTheme}
					class="text-muted transition-colors hover:text-white"
					aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if dark}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line
								x1="12"
								y1="21"
								x2="12"
								y2="23"
							/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line
								x1="18.36"
								y1="18.36"
								x2="19.78"
								y2="19.78"
							/><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line
								x1="4.22"
								y1="19.78"
								x2="5.64"
								y2="18.36"
							/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg
						>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg
						>
					{/if}
				</button>
			</div>

			<!-- Phones: one row, one button. -->
			<div class="flex items-center gap-1 sm:hidden">
				{#if experiences.some((item) => item.path.split('#')[0] === page.url.pathname)}
					<ExperienceNav />
				{/if}
				<button
					onclick={() => (menuOpen = !menuOpen)}
					aria-expanded={menuOpen}
					aria-controls="mobile-menu"
					class="-mr-2 flex items-center gap-2 p-2 text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
				>
					{menuOpen ? 'Close' : 'Menu'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						aria-hidden="true"
					>
						{#if menuOpen}
							<line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
						{:else}
							<line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line
								x1="3"
								y1="18"
								x2="21"
								y2="18"
							/>
						{/if}
					</svg>
				</button>
			</div>
		</div>

		{#if menuOpen}
			<!-- Absolute, so the open menu does not change --nav-h and shove the
			     page down. -->
			<div
				id="mobile-menu"
				class="absolute inset-x-0 top-full border-b border-rule bg-black shadow-lg sm:hidden"
			>
				<div class="mx-auto flex max-w-4xl flex-col px-4 pb-3">
					{#each menuLinks as link (link.href)}
						<a
							href={link.href}
							onclick={() => (menuOpen = false)}
							class="border-b border-rule/40 py-3 text-base text-light no-underline transition-colors hover:text-white"
							>{link.label}</a
						>
					{/each}
					<div class="flex items-center justify-between gap-3 pt-3">
						{#if data.user}
							<span class="min-w-0 truncate text-xs text-muted">{data.user.email}</span>
							<button
								onclick={logout}
								class="shrink-0 text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
								>Log out</button
							>
						{:else}
							<a
								href={loginHref}
								onclick={() => (menuOpen = false)}
								class="text-xs tracking-wide text-muted uppercase no-underline transition-colors hover:text-white"
								>Log in</a
							>
						{/if}
						<button
							onclick={toggleTheme}
							class="shrink-0 text-xs tracking-wide text-muted uppercase transition-colors hover:text-white"
							>{dark ? 'Light mode' : 'Dark mode'}</button
						>
					</div>
				</div>
			</div>
		{/if}
	</nav>

	<main>
		{@render children()}
	</main>

	<footer class="border-t border-rule px-4 py-10 sm:px-6">
		<div class="mx-auto max-w-4xl">
			<p class="text-xs text-muted">
				{courseInfo.title} &mdash; {courseInfo.code} &mdash; {courseInfo.semester}
				&middot; <a href="/qr" class="underline transition-colors hover:text-white">QR code</a>
			</p>
		</div>
	</footer>
</div>
