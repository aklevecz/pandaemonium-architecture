<script lang="ts">
	import { HIGHLIGHT_COLORS, type HighlightColor } from '$lib/highlight-colors';

	interface Props {
		// The colour to show as chosen. Null when nothing is chosen yet (the
		// selection tooltip before the user picks), so no ring is drawn.
		selected?: HighlightColor | null;
		// Touch targets and swatch size step up on phones.
		isMobile: boolean;
		// True while a text selection is live. iOS routes plain taps outside a
		// selection to its own "dismiss selection" handler before click fires,
		// so there we have to grab pointerdown and preventDefault — the same
		// reason SelectionTooltip's buttons do.
		duringSelection?: boolean;
		onPick: (color: HighlightColor) => void;
	}

	const { selected = null, isMobile, duringSelection = false, onPick }: Props = $props();

	const size = $derived(isMobile ? 'h-7 w-7' : 'h-5 w-5');
	const pad = $derived(isMobile ? 'gap-3 px-4 py-2.5' : 'gap-2 px-2.5 py-1.5');
</script>

<div
	class="flex items-center justify-center {pad}"
	style="touch-action: manipulation; -webkit-user-select: none; user-select: none;"
>
	{#each HIGHLIGHT_COLORS as c (c.id)}
		<button
			type="button"
			aria-label="Highlight {c.label.toLowerCase()}"
			aria-pressed={selected === c.id}
			title={c.label}
			onpointerdown={duringSelection
				? (e) => {
						e.preventDefault();
						e.stopPropagation();
						onPick(c.id);
					}
				: undefined}
			onclick={duringSelection
				? undefined
				: (e) => {
						e.stopPropagation();
						onPick(c.id);
					}}
			class="{size} rounded-full border transition-transform hover:scale-110 {selected === c.id
				? 'border-bright ring-2 ring-bright/60'
				: 'border-rule'}"
			style="background-color: rgb({c.rgb} / 0.85);"
		></button>
	{/each}
</div>
