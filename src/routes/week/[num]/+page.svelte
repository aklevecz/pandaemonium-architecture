<script lang="ts">
	import { page } from '$app/state';
	import { weeks, getPdfUrl, getReadingUrl, type Reading } from '$lib/data/syllabus';

	const week = $derived(weeks.find((w) => w.number === Number(page.params.num)));
	const prevWeek = $derived(week ? weeks.find((w) => w.number === week.number - 1) : undefined);
	const nextWeek = $derived(week ? weeks.find((w) => w.number === week.number + 1) : undefined);
</script>

{#if week}
	<article class="mx-auto max-w-3xl px-4 sm:px-6">
		<div class="pt-8 sm:pt-10">
			<a
				href="/#syllabus"
				class="text-xs text-muted transition-colors hover:text-white uppercase"
			>
				&larr; Back
			</a>
		</div>

		<header class="pb-12 pt-10">
			<p class="text-xs text-muted">
				<span class="font-mono tabular-nums">{String(week.number).padStart(2, '0')}</span>
				&ensp;/&ensp;
				{week.date}
			</p>
			<h1 class="mt-3 font-serif text-2xl font-normal leading-tight text-bright sm:text-4xl md:text-5xl">
				{week.title}
			</h1>

			{#if week.epigraph}
				<blockquote class="mt-8 max-w-xl">
					<p class="font-serif text-base leading-relaxed text-gray italic">
						&ldquo;{week.epigraph.text}&rdquo;
					</p>
					<cite class="mt-2 block text-xs text-muted not-italic">
						&mdash; {week.epigraph.source}
					</cite>
				</blockquote>
			{/if}
		</header>

		<div class="h-px bg-rule"></div>

		<!-- Topics -->
		<section class="py-10">
			<p class="text-xs tracking-widest text-muted uppercase">Topics</p>
			<p class="mt-4 font-serif text-base leading-relaxed text-gray">
				{week.topics}
			</p>
		</section>

		<!-- Both reading lists use one row shape so they read as the same kind
		     of object — a thing you open — differing only in weight. The
		     secondary list used to be small muted italics with no affordance,
		     which read as footnotes rather than as links. -->
		{#snippet readingRow(reading: Reading, primary: boolean)}
			<a
				href={getReadingUrl(reading.pdf)}
				class="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3.5 no-underline sm:py-4"
			>
				<span>
					<span
						class="block font-serif leading-snug transition-colors {primary
							? 'text-lg text-light sm:text-xl'
							: 'text-base text-gray'} group-hover:text-bright"
					>
						{reading.title}
					</span>
					<span class="mt-1 block text-xs text-muted">{reading.author}</span>
				</span>
				<span
					class="text-xs text-muted transition-all group-hover:translate-x-0.5 group-hover:text-light"
					aria-hidden="true">&rarr;</span
				>
			</a>
		{/snippet}

		<!-- A week can have no readings (e.g. a visitor session), in which case
		     the heading and its rule would render as an empty band. -->
		{#if week.readings.length > 0}
			<div class="h-px bg-rule"></div>

			<section class="py-10">
				<p class="text-xs tracking-widest text-muted uppercase">
					Readings
					<span class="ml-1 text-muted/60">{week.readings.length}</span>
				</p>
				<div class="mt-4 divide-y divide-rule border-y border-rule">
					{#each week.readings as reading}
						{@render readingRow(reading, true)}
					{/each}
				</div>
			</section>
		{/if}

		{#if week.additionalReadings.length > 0}
			<div class="h-px bg-rule"></div>

			<section class="py-10">
				<p class="text-xs tracking-widest text-muted uppercase">
					Additional Reading &amp; Primary Documents
					<span class="ml-1 text-muted/60">{week.additionalReadings.length}</span>
				</p>
				<div class="mt-4 divide-y divide-rule border-y border-rule">
					{#each week.additionalReadings as reading}
						{@render readingRow(reading, false)}
					{/each}
				</div>
			</section>
		{/if}

		<div class="h-px bg-rule"></div>

		<!-- Lab. Was also small muted italics — same footnote problem as the
		     secondary readings, and it's real content now that labs are written. -->
		<section class="py-10">
			<p class="text-xs tracking-widest text-muted uppercase">Lab</p>
			<p class="mt-3 font-serif text-base leading-relaxed text-gray">
				{week.lab}
			</p>
		</section>

		<div class="h-px bg-rule"></div>

		<!-- Navigation -->
		<nav class="flex items-start justify-between py-10 pb-20">
			{#if prevWeek}
				<a href="/week/{prevWeek.number}" class="group no-underline">
					<span class="text-xs text-muted transition-colors group-hover:text-white"
						>&larr; {String(prevWeek.number).padStart(2, '0')}</span
					>
					<span
						class="mt-1 block font-serif text-sm text-muted transition-colors group-hover:text-light"
						>{prevWeek.title}</span
					>
				</a>
			{:else}
				<div></div>
			{/if}

			{#if nextWeek}
				<a href="/week/{nextWeek.number}" class="group text-right no-underline">
					<span class="text-xs text-muted transition-colors group-hover:text-white"
						>{String(nextWeek.number).padStart(2, '0')} &rarr;</span
					>
					<span
						class="mt-1 block font-serif text-sm text-muted transition-colors group-hover:text-light"
						>{nextWeek.title}</span
					>
				</a>
			{/if}
		</nav>
	</article>
{:else}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<p class="text-sm text-muted">Week not found.</p>
			<a href="/" class="mt-4 inline-block text-xs text-white hover:underline">&larr; Back</a>
		</div>
	</div>
{/if}
