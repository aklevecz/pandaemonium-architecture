<script lang="ts">
	import { marked } from 'marked';

	interface Props {
		role: 'user' | 'assistant';
		content: string;
	}

	const { role, content }: Props = $props();

	// $derived only re-runs when content changes — Svelte's reactivity does the
	// memoization for us. Without this, marked() got called on every parent
	// render, which during streaming meant ~200 parses for a 200-token reply.
	const rendered = $derived(role === 'assistant' ? marked(content) : '');
</script>

<div class="mb-4 {role === 'user' ? 'text-right' : ''}">
	<div
		class="inline-block max-w-[90%] rounded-lg px-3 py-2 text-left {role === 'user'
			? 'bg-rule/50 text-light'
			: 'bg-dark text-gray'}"
	>
		{#if role === 'assistant'}
			<div class="chat-prose font-serif text-sm">
				{@html rendered}
			</div>
		{:else}
			<p class="whitespace-pre-wrap font-serif text-sm">{content}</p>
		{/if}
	</div>
</div>
