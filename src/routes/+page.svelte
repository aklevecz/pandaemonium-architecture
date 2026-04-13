<script lang="ts">
	import { courseInfo, introductoryReadings, weeks, getReadingUrl } from '$lib/data/syllabus';
</script>

<div class="mx-auto max-w-4xl px-4 sm:px-6">
	<!-- Hero -->
	<header class="pb-12 pt-16 sm:pb-16 sm:pt-24">
		<p class="text-xs tracking-widest text-muted uppercase">
			{courseInfo.code} &mdash; {courseInfo.semester}
		</p>
		<h1 class="mt-4 font-serif text-3xl font-normal leading-tight text-bright sm:text-5xl md:text-7xl">
			{courseInfo.title}
		</h1>
		<p class="mt-4 text-sm text-gray">
			{courseInfo.instructor}<br />
			{courseInfo.schedule}
		</p>

		<div class="mt-10 space-y-8 sm:mt-14">
			{#each courseInfo.epigraphs as epigraph}
				<blockquote class="max-w-2xl">
					<p class="font-serif text-base leading-relaxed text-light italic sm:text-lg">
						&ldquo;{epigraph.text}&rdquo;
					</p>
					<cite class="mt-2 block text-xs text-muted not-italic">
						{epigraph.source}
					</cite>
				</blockquote>
			{/each}
		</div>

		<div class="mt-10 h-px bg-rule sm:mt-14"></div>

		<p class="mt-8 max-w-2xl font-serif text-base leading-relaxed text-gray sm:mt-10">
			{courseInfo.description}
		</p>
	</header>

	<!-- Introductory Readings -->
	<section class="pb-12 sm:pb-16">
		<p class="text-xs tracking-widest text-muted uppercase">Introductory Readings</p>
		<div class="mt-5 space-y-3">
			{#each introductoryReadings as reading}
				<a
					href={getReadingUrl(reading.pdf)}
					class="group block no-underline"
				>
					<span class="font-serif text-base text-light transition-colors group-hover:text-bright">
						{reading.author}, <em>{reading.title}</em>
					</span>
				</a>
			{/each}
		</div>
	</section>

	<div class="h-px bg-rule"></div>

	<!-- Syllabus -->
	<section id="syllabus" class="scroll-mt-16 pb-20 pt-12 sm:pb-24 sm:pt-16">
		<p class="text-xs tracking-widest text-muted uppercase">Syllabus</p>

		<div class="mt-8 divide-y divide-rule sm:mt-10">
			{#each weeks as week}
				<a
					href="/week/{week.number}"
					class="group grid grid-cols-[auto_1fr] items-baseline gap-3 py-4 no-underline sm:grid-cols-[auto_1fr_auto] sm:gap-6 sm:py-5"
				>
					<span class="font-mono text-xs text-muted tabular-nums">
						{String(week.number).padStart(2, '0')}
					</span>
					<div>
						<h3
							class="font-serif text-lg text-light transition-colors group-hover:text-bright sm:text-xl"
						>
							{week.title}
						</h3>
						<p class="mt-1 text-xs text-muted line-clamp-1">
							{week.readings.map((r) => r.author).join(', ')}
						</p>
					</div>
					<span class="hidden text-xs text-muted sm:block">{week.date}</span>
				</a>
			{/each}
		</div>

		<div class="mt-6 py-4">
			<p class="text-xs text-muted italic">
				October 13 &mdash; No class (Indigenous People&rsquo;s Day)
			</p>
		</div>
	</section>
</div>
