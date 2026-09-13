<script lang="ts">
	interface Props {
		role: 'user' | 'assistant';
		content: string;
	}

	const { role, content }: Props = $props();

	// Load the parser and sanitizer together. Until ready (or if loading fails),
	// Svelte escapes the plain text. Never render unsanitized model HTML.
	let markedFn = $state<((src: string) => string) | null>(null);
	$effect(() => {
		if (role === 'assistant' && !markedFn) {
			import('$lib/utils/chat-markdown')
				.then((m) => {
					markedFn = m.renderChatMarkdown;
				})
				.catch(() => {
					/* Plain text remains readable and safe. */
				});
		}
	});

	// $derived re-runs when either content OR markedFn changes, so once the
	// import resolves the rendered output upgrades from raw text to HTML.
	const rendered = $derived(role === 'assistant' && markedFn ? markedFn(content) : '');
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
			<p class="font-serif text-sm whitespace-pre-wrap">{content}</p>
		{/if}
	</div>
</div>
