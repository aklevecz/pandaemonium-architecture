<script lang="ts">
	interface Props {
		tooltip: { x: number; y: number; text: string } | null;
		isMobile: boolean;
		onHighlight: (text: string) => void;
		onExplain: (text: string) => void;
	}

	const { tooltip, isMobile, onHighlight, onExplain }: Props = $props();
</script>

{#if tooltip}
	{#if isMobile}
		<!-- iOS's native selection menu (Copy, Look Up, Share) hovers right
		     around the selection and we can't reposition it. So on mobile our
		     menu is pinned to the bottom of the viewport — fully out of the
		     native menu's neighborhood, with comfortable touch targets, and
		     above the existing floating nav toolbar (which is at bottom-5
		     z-30). z-[55] sits above the nav (z-50) and the toolbar but below
		     the modal panels (z-[60]).
		     pointerdown + preventDefault is critical: while a text selection
		     is active, iOS routes plain taps outside the selection to a
		     "dismiss selection" handler and the click event never reaches
		     our buttons. pointerdown fires earlier in the event chain so we
		     can grab the input before iOS reassigns it. -->
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
					Highlight
				</button>
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
{/if}
