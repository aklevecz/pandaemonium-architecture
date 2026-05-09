<script lang="ts">
	interface Props {
		word: string;
		definition: string | null;
		loading: boolean;
		isMobile: boolean;
		onDismiss: () => void;
		onAskMore: () => void;
	}

	const { word, definition, loading, isMobile, onDismiss, onAskMore }: Props = $props();
</script>

<!-- Mobile: bottom sheet so it doesn't fight iOS's selection menu and lives
     in the same neighborhood as our selection pill. Desktop: floating card
     centered horizontally near the bottom; quick to dismiss. -->
<div
	class="fixed inset-x-0 bottom-20 z-[58] flex justify-center px-4 sm:bottom-24"
	role="dialog"
	aria-label="Definition"
>
	<div
		class="w-full max-w-md rounded-lg border border-rule bg-dark/98 p-4 shadow-2xl backdrop-blur-sm"
		style="touch-action: manipulation;"
	>
		<div class="flex items-baseline justify-between gap-3">
			<h3 class="font-serif text-base text-bright">{word}</h3>
			<button
				type="button"
				onpointerdown={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onDismiss();
				}}
				class="text-xs text-muted hover:text-light"
				aria-label="Dismiss"
			>
				&times;
			</button>
		</div>
		<div class="mt-2 min-h-12 font-serif text-sm leading-relaxed text-light">
			{#if loading}
				<span class="inline-flex items-center gap-2 text-muted">
					<span class="text-xs">Looking up</span>
					<span class="flex gap-1">
						<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></span>
						<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></span>
						<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></span>
					</span>
				</span>
			{:else if definition}
				{definition}
			{/if}
		</div>
		{#if !loading && definition}
			<div class="mt-3 flex items-center justify-between border-t border-rule pt-3">
				<p class="text-[10px] uppercase tracking-widest text-muted">Saved to vocab</p>
				<button
					type="button"
					onpointerdown={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onAskMore();
					}}
					class="text-xs text-muted hover:text-light"
				>
					Ask in chat &rarr;
				</button>
			</div>
		{/if}
	</div>
</div>
