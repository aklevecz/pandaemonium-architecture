<script lang="ts">
	import { page } from '$app/state';
	import { weeks, getPdfUrl, getReadingUrl } from '$lib/data/syllabus';

	const week = $derived(weeks.find((w) => w.number === Number(page.params.num)));
	const prevWeek = $derived(week ? weeks.find((w) => w.number === week.number - 1) : undefined);
	const nextWeek = $derived(week ? weeks.find((w) => w.number === week.number + 1) : undefined);
</script>

{#if week}
	<article class="mx-auto max-w-3xl px-6">
		<div class="pt-10">
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
			<h1 class="mt-3 font-serif text-4xl font-normal leading-tight text-bright sm:text-5xl">
				{week.title}
			</h1>

			<blockquote class="mt-8 max-w-xl">
				<p class="font-serif text-base leading-relaxed text-gray italic">
					&ldquo;{week.epigraph.text}&rdquo;
				</p>
				<cite class="mt-2 block text-xs text-muted not-italic">
					&mdash; {week.epigraph.source}
				</cite>
			</blockquote>
		</header>

		<div class="h-px bg-rule"></div>

		<!-- Topics -->
		<section class="py-10">
			<p class="text-xs tracking-widest text-muted uppercase">Topics</p>
			<p class="mt-4 font-serif text-base leading-relaxed text-gray">
				{week.topics}
			</p>
		</section>

		<div class="h-px bg-rule"></div>

		<!-- Readings -->
		<section class="py-10">
			<p class="text-xs tracking-widest text-muted uppercase">Readings</p>
			<div class="mt-6 space-y-6">
				{#each week.readings as reading}
					<div>
						<a
							href={getReadingUrl(reading.pdf)}
							class="group block no-underline"
						>
							<p class="text-xs text-muted">{reading.author}</p>
							<p
								class="mt-1 font-serif text-lg leading-snug text-light transition-colors group-hover:text-bright"
							>
								{reading.title}
							</p>
							<p
								class="mt-1 text-xs text-rule transition-colors group-hover:text-muted"
							>
								Read &rarr;
							</p>
						</a>
					</div>
				{/each}
			</div>
		</section>

		<!-- Additional Readings -->
		{#if week.additionalReadings.length > 0}
			<div class="h-px bg-rule"></div>

			<section class="py-10">
				<p class="text-xs tracking-widest text-muted/60 uppercase">
					Additional Reading
				</p>
				<div class="mt-5 space-y-3">
					{#each week.additionalReadings as reading}
						<a
							href={getReadingUrl(reading.pdf)}
							class="group block no-underline"
						>
							<span
								class="font-serif text-sm text-muted transition-colors group-hover:text-light"
							>
								{reading.author}, <em>{reading.title}</em>
							</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<div class="h-px bg-rule"></div>

		<!-- Lab -->
		<section class="py-10">
			<p class="text-xs tracking-widest text-muted/60 uppercase">Lab</p>
			<p class="mt-3 font-serif text-sm text-muted italic">
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
