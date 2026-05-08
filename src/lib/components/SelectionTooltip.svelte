<script lang="ts">
	interface Props {
		tooltip: { x: number; y: number; text: string } | null;
		onHighlight: (text: string) => void;
		onExplain: (text: string) => void;
	}

	const { tooltip, onHighlight, onExplain }: Props = $props();
</script>

{#if tooltip}
	<div
		class="highlight-tooltip absolute z-50 -translate-x-1/2 -translate-y-full"
		style="left: {tooltip.x}px; top: {tooltip.y}px;"
	>
		<!-- min-h-11 = 44px touch target on mobile; inner padding bumps the
		     hit area without making desktop look chunky. -->
		<div class="flex overflow-hidden rounded-lg border border-rule bg-dark shadow-lg">
			<button
				onclick={() => onHighlight(tooltip.text)}
				class="min-h-11 px-4 py-2 text-sm text-light transition-colors hover:bg-rule/50 hover:text-bright sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
			>
				Highlight
			</button>
			<div class="w-px bg-rule"></div>
			<button
				onclick={() => onExplain(tooltip.text)}
				class="min-h-11 px-4 py-2 text-sm text-light transition-colors hover:bg-rule/50 hover:text-bright sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
			>
				Explain
			</button>
		</div>
	</div>
{/if}
