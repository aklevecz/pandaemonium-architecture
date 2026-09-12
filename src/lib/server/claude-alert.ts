// Tell the instructor when the Claude API stops answering.
//
// Nothing else in the site notices a dead key: each route logs to the Worker
// console and shows the student a generic failure. This module records every
// failure in D1 and emails the instructor on the first one, then stays quiet
// for a while so a class full of retries does not become a class full of
// emails.

import type { RequestEvent } from '@sveltejs/kit';

/** Who gets the email. One address, one copy. */
export const ALERT_TO = ['arielklevecz@students.calarts.edu'];

const FROM = { email: 'login@calarts.app', name: 'Pandaemonium Architecture' };

/** Minimum gap between alert emails. Failures are still logged in between. */
const QUIET_HOURS = 3;

export type FailureKind =
	| 'credits' // out of prepaid credit
	| 'auth' // key revoked or wrong
	| 'rate_limit' // 429
	| 'overloaded' // 529 / 503 on Anthropic's side
	| 'bad_request' // 400 other than credits: stale model name, oversize prompt
	| 'network' // fetch threw
	| 'other';

export interface ClaudeFailure {
	/** Which feature failed, e.g. 'chat', 'define', 'debate', 'adventure'. */
	route: string;
	/** HTTP status from api.anthropic.com, or undefined if fetch threw. */
	status?: number;
	/** Response body or error message. Truncated before storage. */
	detail?: string;
}

export function classify(status: number | undefined, detail: string): FailureKind {
	const text = detail.toLowerCase();
	if (status === undefined) return 'network';
	if (status === 400 && (text.includes('credit balance') || text.includes('billing')))
		return 'credits';
	if (status === 401 || status === 403) return 'auth';
	if (status === 429) return 'rate_limit';
	if (status === 529 || status === 503) return 'overloaded';
	if (status === 400 || status === 404) return 'bad_request';
	return 'other';
}

const HEADLINES: Record<FailureKind, string> = {
	credits: 'Claude API credits have run out',
	auth: 'Claude API key was rejected',
	rate_limit: 'Claude API rate limit hit',
	overloaded: 'Claude API is overloaded',
	bad_request: 'Claude API rejected a request',
	network: 'Claude API could not be reached',
	other: 'Claude API call failed'
};

const ADVICE: Record<FailureKind, string> = {
	credits:
		'Every explain, chat, define, debate and adventure call is failing until the balance is topped up. Add credit at console.anthropic.com under Billing, or turn on auto-reload there so this stops happening mid-class.',
	auth: 'The ANTHROPIC_API_KEY secret on the Worker is not accepted. Check the key in the Anthropic Console and set it again with: npx wrangler secret put ANTHROPIC_API_KEY',
	rate_limit:
		'Too many requests in the current window. Usually clears on its own; if it keeps happening during class, raise the limit in the Anthropic Console under Limits.',
	overloaded: "Anthropic's side, not ours. Calls will start working again when it clears.",
	bad_request:
		'The request was refused. If the detail mentions the model name, the model string in the route needs updating. If it mentions tokens, a prompt is too long.',
	network: 'The Worker could not connect to api.anthropic.com. Usually transient.',
	other: 'See the detail below.'
};

/** What the student sees. Honest about the one case they can do nothing about. */
export function studentMessage(kind: FailureKind): string {
	if (kind === 'credits')
		return 'The course’s Claude credit has run out. The instructor has been emailed.';
	if (kind === 'auth')
		return 'Claude is not configured right now. The instructor has been emailed.';
	if (kind === 'overloaded' || kind === 'rate_limit')
		return 'Claude is busy. Try again in a moment.';
	return 'Claude did not answer. Try again in a moment.';
}

function subjectFor(kind: FailureKind, route: string): string {
	return `${HEADLINES[kind]} (${route})`;
}

function bodyFor(f: ClaudeFailure, kind: FailureKind, host: string, count: number) {
	const when = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
	const lines = [
		HEADLINES[kind] + '.',
		'',
		ADVICE[kind],
		'',
		`Site: ${host}`,
		`Feature: ${f.route}`,
		`Status: ${f.status ?? 'no response'}`,
		`Time: ${when}`,
		`Failures logged in the last ${QUIET_HOURS} hours: ${count}`,
		'',
		'Detail from the API:',
		f.detail?.slice(0, 1500) || '(none)',
		'',
		`No further emails for ${QUIET_HOURS} hours. Failures keep being logged in the claude_failures table.`
	];
	const text = lines.join('\n');
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f5f2;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2ded4;padding:32px;">
    <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7a7364;">Pandaemonium Architecture</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:normal;">${esc(HEADLINES[kind])}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${esc(ADVICE[kind])}</p>
    <table style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:13px;margin:0 0 24px;">
      <tr><td style="padding:4px 16px 4px 0;color:#7a7364;">Site</td><td>${esc(host)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#7a7364;">Feature</td><td>${esc(f.route)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#7a7364;">Status</td><td>${f.status ?? 'no response'}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#7a7364;">Time</td><td>${when}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#7a7364;">Failures, last ${QUIET_HOURS}h</td><td>${count}</td></tr>
    </table>
    <p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7a7364;">Detail from the API:</p>
    <pre style="margin:0 0 24px;padding:12px;background:#f6f5f2;font-size:12px;white-space:pre-wrap;word-break:break-word;">${esc(f.detail?.slice(0, 1500) || '(none)')}</pre>
    <p style="margin:0;padding-top:16px;border-top:1px solid #e2ded4;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a7364;">No further emails for ${QUIET_HOURS} hours. Failures keep being logged in the claude_failures table.</p>
  </div>
</body></html>`;
	return { text, html };
}

/**
 * Record a failed Claude call and, if nothing has been sent recently, email
 * the instructor. Never throws: a broken alert must not make a broken chat
 * worse. Call it without awaiting from inside a stream; the work is handed
 * to waitUntil when the platform provides it.
 */
export function reportClaudeFailure(
	event: Pick<RequestEvent, 'platform' | 'url'>,
	failure: ClaudeFailure
): void {
	const work = doReport(event, failure).catch((err) => {
		console.error('claude-alert: reporting failed', err);
	});
	event.platform?.context?.waitUntil(work);
}

async function doReport(
	event: Pick<RequestEvent, 'platform' | 'url'>,
	failure: ClaudeFailure
): Promise<void> {
	const db = event.platform?.env?.DB;
	const email = event.platform?.env?.EMAIL;
	const detail = (failure.detail ?? '').slice(0, 4000);
	const kind = classify(failure.status, detail);

	console.error(`claude-alert: ${kind} on ${failure.route}`, failure.status, detail.slice(0, 300));
	if (!db) return;

	const insert = await db
		.prepare('INSERT INTO claude_failures (route, kind, status, detail) VALUES (?, ?, ?, ?)')
		.bind(failure.route, kind, failure.status ?? null, detail || null)
		.run();
	const rowId = insert.meta.last_row_id;

	// One email per quiet window, regardless of kind. The first failure of a
	// dead key is the one that matters; the next hundred are the same news.
	const recent = await db
		.prepare(
			`SELECT
			   (SELECT COUNT(*) FROM claude_failures
			     WHERE created_at > datetime('now', ?)) AS n,
			   (SELECT COUNT(*) FROM claude_failures
			     WHERE emailed_at IS NOT NULL AND emailed_at > datetime('now', ?)) AS sent`
		)
		.bind(`-${QUIET_HOURS} hours`, `-${QUIET_HOURS} hours`)
		.first<{ n: number; sent: number }>();
	if ((recent?.sent ?? 0) > 0) return;
	if (!email) {
		console.error('claude-alert: EMAIL binding missing, cannot send alert');
		return;
	}

	// Claim the send before sending so two concurrent failures do not both
	// pass the check above.
	const claim = await db
		.prepare(
			`UPDATE claude_failures SET emailed_at = datetime('now')
			 WHERE id = ? AND NOT EXISTS (
			   SELECT 1 FROM claude_failures
			   WHERE emailed_at IS NOT NULL AND emailed_at > datetime('now', ?) AND id != ?)`
		)
		.bind(rowId, `-${QUIET_HOURS} hours`, rowId)
		.run();
	if (claim.meta.changes !== 1) return;

	const { text, html } = bodyFor(failure, kind, event.url.host, recent?.n ?? 1);
	await email.send({
		to: ALERT_TO,
		from: FROM,
		subject: subjectFor(kind, failure.route),
		text,
		html
	});
}
