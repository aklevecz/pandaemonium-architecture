<script lang="ts">
	// Index of lab decks. Weeks without a deck are listed too, greyed, so it's
	// visible at a glance which labs still need writing.
	import { weeks } from '$lib/data/syllabus';
	import LabDesk from '$lib/components/LabDesk.svelte';

	let { data } = $props();

	const rows = $derived(
		weeks.map((w) => ({ week: w, lab: data.labs.find((l) => l.number === w.number) }))
	);
</script>

<svelte:head>
	<title>Labs · Pandaemonium Architecture</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pt-12 pb-8">
		<a href="/" class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; Back</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Labs</h1>
		<p class="mt-3 max-w-xl font-serif text-base leading-relaxed text-gray">
			One deck per lab, projected in the room and left up afterwards. Each takes a stance toward the
			apparatus rather than teaching a tool.
		</p>
		<p class="mt-4 text-xs text-muted">
			<a href="#desk" class="no-underline transition-colors hover:text-light"
				>Lab desk: contact, meetings, Fuser access &darr;</a
			>
		</p>
	</header>

	<div class="divide-y divide-rule border-y border-rule">
		{#each rows as { week, lab } (week.number)}
			{#if lab}
				<a href="/lab/{lab.number}" class="group block py-5 no-underline">
					<div class="flex items-baseline justify-between gap-4">
						<p class="text-xs text-muted">
							<span class="font-mono tabular-nums">{String(week.number).padStart(2, '0')}</span>
							&ensp;/&ensp;{week.date}
						</p>
						<p class="text-[10px] tracking-widest text-muted uppercase">{lab.stance}</p>
					</div>
					<h2 class="mt-1 font-serif text-2xl text-light transition-colors group-hover:text-bright">
						{lab.title}
					</h2>
					<p class="mt-1 font-serif text-sm leading-relaxed text-gray">{lab.blurb}</p>
					<p class="mt-2 text-xs text-muted">
						{#if lab.draft}<span class="mr-2 text-light">Draft &middot; not published</span>{/if}
						{lab.slideCount} slides
						<span class="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden="true"
							>&rarr;</span
						>
					</p>
				</a>
			{:else}
				<div class="py-5 opacity-45">
					<p class="text-xs text-muted">
						<span class="font-mono tabular-nums">{String(week.number).padStart(2, '0')}</span>
						&ensp;/&ensp;{week.date}
					</p>
					<h2 class="mt-1 font-serif text-2xl text-muted">{week.title}</h2>
					<p class="mt-1 text-xs text-muted">No deck yet</p>
				</div>
			{/if}
		{/each}
	</div>
	<!-- The lab desk is for signed-in students; signed out, the server sends
	     nothing (not even the contact address) and this is just an invitation. -->
	{#if data.desk}
		<LabDesk desk={data.desk} />
	{:else}
		<section id="desk" class="border-t border-rule py-10">
			<p class="text-xs tracking-widest text-muted uppercase">Lab desk</p>
			<p class="mt-3 max-w-xl font-serif text-sm leading-relaxed text-gray">
				<a
					href="/login?next=%2Flab%23desk"
					class="text-light underline decoration-rule underline-offset-4 hover:text-bright"
					>Sign in</a
				>
				to see the lab instructor's email, ask for time to meet, and sign up for Fuser access.
			</p>
		</section>
	{/if}
	<div class="pb-24"></div>
</div>
