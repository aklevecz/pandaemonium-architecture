<script lang="ts">
	interface KeyTerm { term: string; gloss: string }
	interface Passage { text: string; why: string }
	interface Related { slug: string; score: number }
	interface Summary {
		tldr?: string;
		thesis?: string;
		keyTerms?: KeyTerm[];
		outline?: string[];
		representativePassages?: Passage[];
		relatedReadings?: Related[];
	}
	interface Props {
		summary: Summary | null;
		readingSlug: string;
		readingFallback: Record<string, { author: string; title: string }>;
		syllabusMeta: Map<string, { author: string; title: string }>;
		onJumpToPassage: (text: string) => void;
	}

	const { summary, readingFallback, syllabusMeta, onJumpToPassage }: Props = $props();

	// Default to collapsed so re-readers don't have to scroll past it every
	// time. The TL;DR is visible in the collapsed header to make the expand
	// affordance meaningful.
	let open = $state(false);

	function metaFor(slug: string) {
		return syllabusMeta.get(slug) ?? readingFallback[slug] ?? { title: slug, author: '' };
	}
</script>

{#if summary}
	<section class="not-prose mb-6 rounded border border-rule bg-dark/40">
		<button
			type="button"
			onclick={() => (open = !open)}
			class="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-rule/20"
			aria-expanded={open}
		>
			<div class="min-w-0 flex-1">
				<p class="text-[10px] uppercase tracking-widest text-muted">Summary</p>
				{#if summary.tldr}
					<p class="mt-1 font-serif text-sm text-light">{summary.tldr}</p>
				{/if}
			</div>
			<span class="shrink-0 text-xs text-muted">{open ? '−' : '+'}</span>
		</button>

		{#if open}
			<div class="border-t border-rule px-4 py-4 sm:px-5">
				{#if summary.thesis}
					<div class="mb-5">
						<p class="text-[10px] uppercase tracking-widest text-muted">Argument</p>
						<p class="mt-2 font-serif text-sm leading-relaxed text-light">{summary.thesis}</p>
					</div>
				{/if}

				{#if summary.outline?.length}
					<div class="mb-5">
						<p class="text-[10px] uppercase tracking-widest text-muted">Argumentative shape</p>
						<ol class="mt-2 list-decimal space-y-1 pl-5 font-serif text-sm leading-relaxed text-gray marker:text-muted">
							{#each summary.outline as step (step)}
								<li>{step}</li>
							{/each}
						</ol>
					</div>
				{/if}

				{#if summary.keyTerms?.length}
					<div class="mb-5">
						<p class="text-[10px] uppercase tracking-widest text-muted">Key terms</p>
						<dl class="mt-2 space-y-3">
							{#each summary.keyTerms as kt (kt.term)}
								<div>
									<dt class="font-serif text-sm text-light">{kt.term}</dt>
									<dd class="mt-0.5 font-serif text-sm leading-relaxed text-gray">{kt.gloss}</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/if}

				{#if summary.representativePassages?.length}
					<div class="mb-5">
						<p class="text-[10px] uppercase tracking-widest text-muted">Representative passages</p>
						<div class="mt-2 space-y-3">
							{#each summary.representativePassages as p (p.text)}
								<button
									type="button"
									onclick={() => onJumpToPassage(p.text)}
									class="block w-full border-l-2 border-yellow-500/30 py-1 pl-3 text-left transition-colors hover:border-yellow-400"
									title="Jump to this passage in the reading"
								>
									<p class="font-serif text-sm italic leading-relaxed text-light">&ldquo;{p.text}&rdquo;</p>
									<p class="mt-1 text-xs text-muted">{p.why}</p>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if summary.relatedReadings?.length}
					<div>
						<p class="text-[10px] uppercase tracking-widest text-muted">Related readings</p>
						<ul class="mt-2 space-y-1.5">
							{#each summary.relatedReadings as r (r.slug)}
								{@const m = metaFor(r.slug)}
								<li>
									<a
										href="/reading/{r.slug}"
										class="group flex items-baseline justify-between gap-2 no-underline"
									>
										<span class="min-w-0">
											{#if m.author}
												<span class="text-xs text-muted">{m.author}</span>
											{/if}
											<span class="ml-1 font-serif text-sm text-light transition-colors group-hover:text-bright">
												{m.title}
											</span>
										</span>
										<span class="shrink-0 font-mono text-[10px] text-muted tabular-nums">
											{(r.score * 100).toFixed(0)}%
										</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
	</section>
{/if}
