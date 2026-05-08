<script lang="ts">
	interface Props {
		tooltip: { x: number; y: number; text: string } | null;
		isMobile: boolean;
		// When true, the primary button replaces "Highlight" with "Update"
		// and the explain button is suppressed — the user is in the middle of
		// re-anchoring an existing highlight, not adding a new one.
		extendMode?: boolean;
		onHighlight: (text: string) => void;
		onExplain: (text: string) => void;
	}

	const {
		tooltip,
		isMobile,
		extendMode = false,
		onHighlight,
		onExplain
	}: Props = $props();

	const primaryLabel = $derived(extendMode ? 'Update' : 'Highlight');
</script>

{#if tooltip}
	{#if isMobile}
		<!-- iOS's native selection menu (Copy, Look Up, Share) hovers right
		     around the selection and we can't reposition it. Pinned to bottom
		     of viewport, out of the native menu's neighborhood, with
		     comfortable touch targets, above the existing nav toolbar
		     (z-30) and below modal panels (z-[60]).
		     pointerdown + preventDefault: while a selection is active iOS
		     routes plain taps outside the selection to a "dismiss selection"
		     handler before click reaches our buttons. pointerdown fires
		     earlier in the event chain so we can grab the input first. -->
		<div class="fixed inset-x-0 bottom-20 z-[55] flex justify-center px-4">
			<div
				class="flex overflow-hidden rounded-full border border-rule bg-dark shadow-lg"
				style="touch-action: manipulation; -webkit-user-select: none; user-select: none;"
			>
				<button
					type="button"
					onpointerdown={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onHighlight(tooltip.text);
					}}
					class="min-h-11 px-5 py-2 text-sm text-light transition-colors hover:bg-rule/50 hover:text-bright active:bg-rule/60"
				>
					{primaryLabel}
				</button>
				{#if !extendMode}
					<div class="w-px bg-rule"></div>
					<button
						type="button"
						onpointerdown={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onExplain(tooltip.text);
						}}
						class="min-h-11 px-5 py-2 text-sm text-light transition-colors hover:bg-rule/50 hover:text-bright active:bg-rule/60"
					>
						Explain
					</button>
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="highlight-tooltip absolute z-50 -translate-x-1/2 -translate-y-full"
			style="left: {tooltip.x}px; top: {tooltip.y}px;"
		>
			<div class="flex overflow-hidden rounded-lg border border-rule bg-dark shadow-lg">
				<button
					onclick={() => onHighlight(tooltip.text)}
					class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
				>
					{primaryLabel}
				</button>
				{#if !extendMode}
					<div class="w-px bg-rule"></div>
					<button
						onclick={() => onExplain(tooltip.text)}
						class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
					>
						Explain
					</button>
				{/if}
			</div>
		</div>
	{/if}
{/if}
