// The highlight palette, shared by the client (swatch UI, mark painting) and
// the server (validating what gets written to the `color` column).
//
// `rgb` is a space-separated triple so it can be dropped straight into a CSS
// `rgb(R G B / alpha)` at whatever opacity the context wants — 0.25 for the
// resting mark, 0.4 for hover, opaque for a swatch. Keeping the numbers here
// rather than in layout.css means the palette has exactly one definition:
// marks get `--hl-rgb` set inline from this table.
export const HIGHLIGHT_COLORS = [
	{ id: 'yellow', label: 'Yellow', rgb: '234 179 8' },
	{ id: 'green', label: 'Green', rgb: '34 197 94' },
	{ id: 'blue', label: 'Blue', rgb: '59 130 246' },
	{ id: 'pink', label: 'Pink', rgb: '244 114 182' },
	{ id: 'purple', label: 'Purple', rgb: '167 139 250' }
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]['id'];

// Yellow is what every highlight saved before this feature existed is
// backfilled to, so it stays the default for new ones too.
export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = 'yellow';

export function isHighlightColor(v: unknown): v is HighlightColor {
	return typeof v === 'string' && HIGHLIGHT_COLORS.some((c) => c.id === v);
}

// Falls back rather than throwing: a row written by an older client, or one
// whose colour was removed from the palette, should still render.
export function colorRgb(id: string | null | undefined): string {
	return (
		HIGHLIGHT_COLORS.find((c) => c.id === id)?.rgb ??
		HIGHLIGHT_COLORS.find((c) => c.id === DEFAULT_HIGHLIGHT_COLOR)!.rgb
	);
}
