<script lang="ts">
	interface Props {
		role: 'user' | 'assistant';
		content: string;
	}

	const { role, content }: Props = $props();

	// Lazy-load marked. Chat is closed by default on the reader page, so most
	// page loads never need the markdown parser; deferring its import saves
	// ~50KB on the initial JS payload. Until marked resolves we render the
	// raw streaming text, which is fine because (a) it's monospace-friendly
	// markdown, and (b) the parent suppresses the bubble until content > 0.
	let markedFn = $state<((src: string) => string) | null>(null);
	$effect(() => {
		if (role === 'assistant' && !markedFn) {
			import('marked').then((m) => {
				markedFn = m.marked as (src: string) => string;
			});
		}
	});

	// $derived re-runs when either content OR markedFn changes, so once the
	// import resolves the rendered output upgrades from raw text to HTML.
	const rendered = $derived(
		role === 'assistant' && markedFn ? markedFn(content) : ''
	);
</script>

<div class="mb-4 {role === 'user' ? 'text-right' : ''}">
	<div
		class="inline-block max-w-[90%] rounded-lg px-3 py-2 text-left {role === 'user'
			? 'bg-rule/50 text-light'
			: 'bg-dark text-gray'}"
	>
		{#if role === 'assistant'}
			<div class="chat-prose font-serif text-sm">
				{#if markedFn}
					{@html rendered}
				{:else}
					<!-- Pre-load: show raw text so the user sees their answer, even
					     before the marked parser is ready. Looks like plain prose. -->
					<p class="whitespace-pre-wrap">{content}</p>
				{/if}
			</div>
		{:else}
			<p class="whitespace-pre-wrap font-serif text-sm">{content}</p>
		{/if}
	</div>
</div>
