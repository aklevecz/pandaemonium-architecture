<script lang="ts">
	import HighlightSwatches from './HighlightSwatches.svelte';
	import type { HighlightColor } from '$lib/highlight-colors';

	interface Props {
		// `below` is true when the card is anchored under the selection because
		// there wasn't room above it; it flips the vertical draw direction.
		tooltip: { x: number; y: number; text: string; below: boolean } | null;
		isMobile: boolean;
		// When true, the primary button replaces "Highlight" with "Update"
		// and the explain/define buttons are suppressed — the user is
		// re-anchoring an existing highlight. The swatch row is suppressed
		// too: extending keeps the highlight's existing colour.
		extendMode?: boolean;
		// Last colour the user picked, used by the plain "Highlight" button so
		// the common case stays one tap.
		currentColor: HighlightColor;
		onHighlight: (text: string, color: HighlightColor) => void;
		onExplain: (text: string) => void;
		onDefine: (text: string) => void;
	}

	const {
		tooltip,
		isMobile,
		extendMode = false,
		currentColor,
		onHighlight,
		onExplain,
		onDefine
	}: Props = $props();

	const primaryLabel = $derived(extendMode ? 'Update' : 'Highlight');
	// Define is most useful for short selections — for paragraph-length
	// selections the user wants Explain, not a glossary entry.
	const showDefine = $derived(
		!extendMode && (tooltip?.text?.length ?? 0) <= 80
	);
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
				class="overflow-hidden rounded-3xl border border-rule bg-dark shadow-lg"
				style="touch-action: manipulation; -webkit-user-select: none; user-select: none;"
			>
				{#if !extendMode}
					<!-- Tapping a swatch highlights in that colour outright, so
					     picking a colour is one tap rather than pick-then-confirm. -->
					<HighlightSwatches
						{isMobile}
						duringSelection
						selected={currentColor}
						onPick={(c) => onHighlight(tooltip.text, c)}
					/>
					<div class="h-px bg-rule"></div>
				{/if}
				<div class="flex">
					<button
						type="button"
						onpointerdown={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onHighlight(tooltip.text, currentColor);
						}}
						class="min-h-11 px-5 py-2 text-sm text-light transition-colors hover:bg-rule/50 hover:text-bright active:bg-rule/60"
					>
						{primaryLabel}
					</button>
					{#if showDefine}
						<div class="w-px bg-rule"></div>
						<button
							type="button"
							onpointerdown={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onDefine(tooltip.text);
							}}
							class="min-h-11 px-5 py-2 text-sm text-light transition-colors hover:bg-rule/50 hover:text-bright active:bg-rule/60"
						>
							Define
						</button>
					{/if}
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
		</div>
	{:else}
		<div
			class="highlight-tooltip absolute z-50 -translate-x-1/2 {tooltip.below
				? ''
				: '-translate-y-full'}"
			style="left: {tooltip.x}px; top: {tooltip.y}px;"
		>
			<div class="overflow-hidden rounded-lg border border-rule bg-dark shadow-lg">
				{#if !extendMode}
					<HighlightSwatches
						{isMobile}
						duringSelection
						selected={currentColor}
						onPick={(c) => onHighlight(tooltip.text, c)}
					/>
					<div class="h-px bg-rule"></div>
				{/if}
				<div class="flex">
					<button
						onclick={() => onHighlight(tooltip.text, currentColor)}
						class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
					>
						{primaryLabel}
					</button>
					{#if showDefine}
						<div class="w-px bg-rule"></div>
						<button
							onclick={() => onDefine(tooltip.text)}
							class="px-3 py-1.5 text-xs text-light transition-colors hover:bg-rule/50 hover:text-bright"
						>
							Define
						</button>
					{/if}
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
		</div>
	{/if}
{/if}
