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
		<div class="flex overflow-hidden rounded-lg border border-rule bg-dark shadow-lg">
			<button
				onclick={() => onHighlight(tooltip.text)}
				class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
			>
				Highlight
			</button>
			<div class="w-px bg-rule"></div>
			<button
				onclick={() => onExplain(tooltip.text)}
				class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
			>
				Explain
			</button>
		</div>
	</div>
{/if}
