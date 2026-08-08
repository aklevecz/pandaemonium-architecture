<script lang="ts">
	import {
		courseInfo,
		introductoryReadings,
		weeks,
		getReadingUrl,
		type Week
	} from '$lib/data/syllabus';

	// "Up next" marker: the first week that hasn't fully passed. A week stays
	// current through the six days after its meeting date. Year comes from the
	// semester string so this survives the next changeover.
	const year = Number(courseInfo.semester.match(/\d{4}/)?.[0] ?? new Date().getFullYear());
	const now = Date.now();
	const weekStart = (w: Week) => new Date(`${w.date}, ${year}`).getTime();
	const upNext = weeks.find((w) => now - weekStart(w) < 6 * 86_400_000)?.number;
</script>

<div class="mx-auto max-w-4xl px-4 sm:px-6">
	<!-- Compact header: everything needed to orient, nothing that delays the list. -->
	<header class="pt-8 sm:pt-10">
		<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
			<h1 class="font-serif text-2xl font-normal leading-tight text-bright sm:text-3xl">
				{courseInfo.title}
			</h1>
			<p class="text-xs tracking-widest text-muted uppercase">
				{courseInfo.code} &mdash; {courseInfo.semester}
			</p>
		</div>
		<p class="mt-2 text-xs text-muted">
			{courseInfo.instructor} &middot; Labs: {courseInfo.labs} &middot; {courseInfo.schedule}
		</p>

		{#each introductoryReadings as reading}
			<p class="mt-4 text-sm">
				<span class="text-xs tracking-widest text-muted uppercase">Intro reading&ensp;</span>
				<a
					href={getReadingUrl(reading.pdf)}
					class="font-serif text-light no-underline transition-colors hover:text-bright"
				>
					{reading.author}, <em>{reading.title}</em>
				</a>
			</p>
		{/each}
	</header>

	<!-- Syllabus, immediately. -->
	<section id="syllabus" class="scroll-mt-16 pt-8 sm:pt-10">
		<p class="text-xs tracking-widest text-muted uppercase">Syllabus</p>

		<div class="mt-4 divide-y divide-rule border-y border-rule sm:mt-5">
			{#each weeks as week}
				<a
					href="/week/{week.number}"
					class="group grid grid-cols-[auto_1fr_auto] items-baseline gap-3 py-3 no-underline sm:gap-6 sm:py-4"
				>
					<span class="font-mono text-xs text-muted tabular-nums">
						{String(week.number).padStart(2, '0')}
					</span>
					<div>
						<h3
							class="font-serif text-base leading-snug transition-colors sm:text-lg {week.number ===
							upNext
								? 'text-bright'
								: 'text-light'} group-hover:text-bright"
						>
							{week.title}
							{#if week.number === upNext}
								<span
									class="ml-2 inline-block translate-y-[-2px] rounded-sm border border-rule px-1.5 py-0.5 font-sans text-[10px] tracking-wider text-muted uppercase"
									>Next</span
								>
							{/if}
						</h3>
						{#if week.readings.length}
							<p class="mt-0.5 text-xs text-muted line-clamp-1">
								{week.readings.map((r) => r.author).join(', ')}
							</p>
						{/if}
					</div>
					<span class="text-right text-[11px] text-muted sm:text-xs">{week.date}</span>
				</a>
				{#if week.number === 4}
					<!-- Falls between the Oct 5 and Oct 19 meetings. -->
					<p class="py-2.5 pl-8 text-xs text-muted italic sm:pl-11">
						October 12 &mdash; No class (Indigenous People&rsquo;s Day)
					</p>
				{/if}
			{/each}
		</div>
	</section>

	<!-- Course identity lives below the working surface. -->
	<section id="about" class="pt-12 pb-20 sm:pt-16 sm:pb-24">
		<p class="text-xs tracking-widest text-muted uppercase">About</p>

		<p class="mt-6 max-w-2xl font-serif text-base leading-relaxed text-gray">
			{courseInfo.description}
		</p>

		<div class="mt-8 space-y-8">
			{#each courseInfo.epigraphs as epigraph}
				<blockquote class="max-w-2xl">
					<p class="font-serif text-base leading-relaxed text-light italic">
						&ldquo;{epigraph.text}&rdquo;
					</p>
					<cite class="mt-2 block text-xs text-muted not-italic">
						{epigraph.source}
					</cite>
				</blockquote>
			{/each}
		</div>
	</section>
</div>
