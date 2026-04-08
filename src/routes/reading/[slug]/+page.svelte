<script lang="ts">
	import { getPdfUrl } from '$lib/data/syllabus';

	let { data } = $props();
</script>

<article class="mx-auto max-w-3xl px-6">
	<div class="pt-10">
		{#if data.weekNumber}
			<a
				href="/week/{data.weekNumber}"
				class="text-xs text-muted transition-colors hover:text-white uppercase"
			>
				&larr; Week {String(data.weekNumber).padStart(2, '0')}
			</a>
		{:else}
			<a
				href="/"
				class="text-xs text-muted transition-colors hover:text-white uppercase"
			>
				&larr; Back
			</a>
		{/if}
	</div>

	<header class="pb-12 pt-10">
		<p class="text-xs text-muted">{data.author}</p>
		<h1 class="mt-3 font-serif text-3xl font-normal leading-tight text-bright sm:text-4xl">
			{data.title}
		</h1>
		<div class="mt-4 flex items-center gap-4">
			{#if data.weekNumber}
				<span class="text-xs text-muted">
					Week {String(data.weekNumber).padStart(2, '0')} &mdash; {data.weekTitle}
					{#if data.isAdditional}
						&mdash; Additional Reading
					{/if}
				</span>
			{:else if data.isIntroductory}
				<span class="text-xs text-muted">Introductory Reading</span>
			{/if}
			<a
				href={getPdfUrl(data.pdf)}
				target="_blank"
				rel="noopener"
				class="text-xs text-rule transition-colors hover:text-muted"
			>
				PDF &rarr;
			</a>
		</div>
	</header>

	<div class="h-px bg-rule"></div>

	<div class="prose py-12">
		{@html data.content}
	</div>
</article>
