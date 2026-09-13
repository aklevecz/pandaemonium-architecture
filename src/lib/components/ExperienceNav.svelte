<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		experiences,
		experienceContext,
		experienceStorageKey,
		courseExperienceHref,
		nekhenExperienceHref,
		type ExperienceContext
	} from '$lib/experience-links';
	let { slide, above = false }: { slide?: number; above?: boolean } = $props();
	let saved = $state<ExperienceContext | null>(null);
	let loaded = $state(false);
	let open = $state(false);
	const context = $derived(experienceContext(page.url, saved, slide));
	onMount(() => {
		try {
			saved = JSON.parse(sessionStorage.getItem(experienceStorageKey) ?? 'null');
		} catch {
			/* Optional navigation memory. */
		}
		loaded = true;
	});
	$effect(() => {
		if (!loaded) return;
		try {
			sessionStorage.setItem(experienceStorageKey, JSON.stringify(context));
		} catch {
			/* Links still carry context. */
		}
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') open = false;
	}}
/>
<details class:above bind:open>
	<summary>Experiences</summary>
	<nav aria-label="Connected lab experiences">
		<a href={courseExperienceHref('/lab/1', context)} onclick={() => (open = false)}
			>Lab 01 · slide {context.slide}</a
		>
		<a href={nekhenExperienceHref(context)} onclick={() => (open = false)}
			>Nekhen · class poll / next word</a
		>
		{#each experiences as item}
			<a href={courseExperienceHref(item.path, context)} onclick={() => (open = false)}
				>{item.label}</a
			>
		{/each}
	</nav>
</details>

<style>
	details {
		position: relative;
		font-size: 12px;
		color: var(--color-white);
		line-height: 1.5;
	}
	summary {
		cursor: pointer;
		padding: 6px 0;
		white-space: nowrap;
	}
	nav {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 80;
		width: min(270px, calc(100vw - 32px));
		max-height: 65dvh;
		overflow-y: auto;
		padding: 8px;
		border: 1px solid var(--color-rule);
		border-radius: 3px;
		background: var(--color-black);
		box-shadow: 0 6px 20px #0003;
	}
	.above nav {
		top: auto;
		bottom: 100%;
		left: 0;
		right: auto;
	}
	a {
		display: block;
		padding: 8px 10px;
		color: inherit;
		text-decoration: none;
	}
	a:hover,
	a:focus-visible {
		background: var(--color-dark);
		text-decoration: underline;
	}
	summary:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 3px;
	}
</style>
