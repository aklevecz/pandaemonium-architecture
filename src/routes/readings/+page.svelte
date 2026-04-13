<script lang="ts">
	import { weeks, introductoryReadings, getReadingUrl, type Reading } from '$lib/data/syllabus';

	interface ReadingWithWeek extends Reading {
		weekNumber: number;
		weekTitle: string;
	}

	const allReadings = $derived.by(() => {
		const readings: ReadingWithWeek[] = [];

		for (const week of weeks) {
			for (const r of week.readings) {
				readings.push({ ...r, weekNumber: week.number, weekTitle: week.title });
			}
			for (const r of week.additionalReadings) {
				readings.push({ ...r, weekNumber: week.number, weekTitle: week.title });
			}
		}

		readings.sort((a, b) => a.author.localeCompare(b.author));
		return readings;
	});
</script>

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pb-12 pt-12">
		<a
			href="/"
			class="text-xs text-muted transition-colors hover:text-white uppercase"
		>
			&larr; Back
		</a>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Index</h1>
		<p class="mt-2 text-xs text-muted">
			{allReadings.length + introductoryReadings.length} texts
		</p>
	</header>

	<div class="h-px bg-rule"></div>

	<section class="py-10">
		<p class="text-xs tracking-widest text-muted uppercase">Introductory</p>
		<div class="mt-5 space-y-3">
			{#each introductoryReadings as reading}
				<a
					href={getReadingUrl(reading.pdf)}

					class="group block no-underline"
				>
					<span class="font-serif text-sm text-light transition-colors group-hover:text-bright">
						{reading.author}, <em>{reading.title}</em>
					</span>
				</a>
			{/each}
		</div>
	</section>

	<div class="h-px bg-rule"></div>

	<section class="py-10 pb-24">
		<p class="text-xs tracking-widest text-muted uppercase">All Readings</p>
		<div class="mt-6 divide-y divide-rule">
			{#each allReadings as reading}
				<div class="flex items-baseline justify-between gap-6 py-3">
					<a
						href={getReadingUrl(reading.pdf)}
						target="_blank"
						rel="noopener"
						class="group flex-1 no-underline"
					>
						<span class="text-xs text-muted">{reading.author}</span>
						<span
							class="block font-serif text-sm text-light transition-colors group-hover:text-bright"
						>
							{reading.title}
						</span>
					</a>
					<a
						href="/week/{reading.weekNumber}"
						class="shrink-0 font-mono text-xs text-muted no-underline transition-colors hover:text-white tabular-nums"
					>
						{String(reading.weekNumber).padStart(2, '0')}
					</a>
				</div>
			{/each}
		</div>
	</section>
</div>
