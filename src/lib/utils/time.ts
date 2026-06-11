// SQLite's datetime('now') is UTC without a timezone marker ("YYYY-MM-DD
// HH:MM:SS"); browsers parse that as *local* time, skewing every displayed
// date by the user's UTC offset. Normalize before parsing.
export function parseUTC(iso: string): Date {
	return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : iso.replace(' ', 'T') + 'Z');
}

// Compact relative time for list rows: "3:24 PM" (today), "Yesterday",
// "Mon" (this week), "Jun 3" (this year), "Jun 3, 2025" (older).
export function relTime(iso: string | null | undefined): string {
	if (!iso) return '';
	const d = parseUTC(iso);
	if (Number.isNaN(d.getTime())) return '';
	const now = new Date();
	const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
	const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
	if (dayDiff <= 0) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	if (dayDiff === 1) return 'Yesterday';
	if (dayDiff < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
	return d.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
	});
}
