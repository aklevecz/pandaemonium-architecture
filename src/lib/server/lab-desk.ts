import type { D1Database } from '@cloudflare/workers-types';
import type { RequestEvent } from '@sveltejs/kit';
import { courseInfo } from '$lib/data/syllabus';
import { nameFor } from './commons';

/**
 * The lab desk: the lab instructor's contact, meeting requests, and the
 * Fuser access sign-up sheet.
 *
 * Server-only on purpose. The contact address is handed to the page only for
 * signed-in viewers, so it never sits in public HTML or the client bundle
 * for a scraper to find.
 */

export const LAB_CONTACT = {
	name: courseInfo.labs,
	email: 'arielklevecz@students.calarts.edu'
};

const FROM = { email: 'login@calarts.app', name: 'Pandaemonium Architecture' };

export const MAX_TOPIC = 600;
export const MAX_AVAILABILITY = 400;
export const MAX_REPLY = 600;
export const MAX_NOTE = 300;
/** A student can have this many unanswered requests at once. */
export const MAX_OPEN_REQUESTS = 3;

export const MEETING_STATUSES = ['open', 'scheduled', 'done'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];
export const FUSER_STATUSES = ['requested', 'granted'] as const;
export type FuserStatus = (typeof FUSER_STATUSES)[number];

export interface MeetingRequest {
	id: number;
	topic: string;
	availability: string;
	status: MeetingStatus;
	reply: string;
	created_at: string;
	updated_at: string;
	/** Present only in the instructor's view. */
	student?: { name: string; email: string };
}

export interface FuserSheetRow {
	id: number;
	name: string;
	status: FuserStatus;
	created_at: string;
	mine: boolean;
	/** Present on the viewer's own row and in the instructor's view. */
	fuserEmail?: string;
	note?: string;
	/** Instructor's view only: the address they sign in here with. */
	accountEmail?: string;
}

export function cleanText(raw: unknown, max: number): string | null {
	if (typeof raw !== 'string') return null;
	const text = raw.replace(/\r\n/g, '\n').trim();
	if (text.length > max) return null;
	return text;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function cleanEmail(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const email = raw.trim().toLowerCase();
	if (email.length > 254 || !EMAIL_RE.test(email)) return null;
	return email;
}

interface MeetingRow {
	id: number;
	topic: string;
	availability: string;
	status: MeetingStatus;
	reply: string;
	created_at: string;
	updated_at: string;
	email: string;
	display_name: string | null;
}

/** A student's own requests, newest first. */
export async function loadMyMeetings(db: D1Database, userId: number): Promise<MeetingRequest[]> {
	const res = await db
		.prepare(
			`SELECT id, topic, availability, status, reply, created_at, updated_at
			 FROM meeting_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 20`
		)
		.bind(userId)
		.all<Omit<MeetingRow, 'email' | 'display_name'>>();
	return res.results ?? [];
}

/** Everyone's requests, for the instructor. Open first, then most recent. */
export async function loadAllMeetings(db: D1Database): Promise<MeetingRequest[]> {
	const res = await db
		.prepare(
			`SELECT m.id, m.topic, m.availability, m.status, m.reply, m.created_at, m.updated_at,
			        u.email, u.display_name
			 FROM meeting_requests m JOIN users u ON u.id = m.user_id
			 ORDER BY CASE m.status WHEN 'open' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
			          m.created_at DESC, m.id DESC
			 LIMIT 200`
		)
		.bind()
		.all<MeetingRow>();
	return (res.results ?? []).map(({ email, display_name, ...m }) => ({
		...m,
		student: { name: nameFor(email, display_name), email }
	}));
}

/**
 * The sign-up sheet. Classmates see names and status; addresses and notes
 * are only filled in on the viewer's own row, or on every row for the
 * instructor.
 */
export async function loadFuserSheet(
	db: D1Database,
	viewer: { id: number; isInstructor: boolean }
): Promise<FuserSheetRow[]> {
	const res = await db
		.prepare(
			`SELECT f.id, f.user_id, f.fuser_email, f.note, f.status, f.created_at,
			        u.email, u.display_name
			 FROM fuser_signups f JOIN users u ON u.id = f.user_id
			 ORDER BY f.created_at ASC, f.id ASC`
		)
		.bind()
		.all<{
			id: number;
			user_id: number;
			fuser_email: string;
			note: string;
			status: FuserStatus;
			created_at: string;
			email: string;
			display_name: string | null;
		}>();
	return (res.results ?? []).map((r) => {
		const mine = r.user_id === viewer.id;
		const row: FuserSheetRow = {
			id: r.id,
			name: nameFor(r.email, r.display_name),
			status: r.status,
			created_at: r.created_at,
			mine
		};
		if (mine || viewer.isInstructor) {
			row.fuserEmail = r.fuser_email;
			row.note = r.note;
		}
		if (viewer.isInstructor) row.accountEmail = r.email;
		return row;
	});
}

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

function shell(title: string, bodyHtml: string): string {
	return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f5f2;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2ded4;padding:32px;">
    <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7a7364;">Pandaemonium Architecture · Lab desk</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:normal;">${esc(title)}</h1>
    ${bodyHtml}
  </div>
</body></html>`;
}

/**
 * Fire-and-forget email. A meeting request is saved whether or not the
 * notification goes out: the desk on /lab is the record, the email is a nudge.
 */
function sendLater(
	event: Pick<RequestEvent, 'platform'>,
	message: { to: string; replyTo?: string; subject: string; text: string; html: string }
): void {
	const email = event.platform?.env?.EMAIL;
	if (!email) {
		console.error('lab-desk: EMAIL binding missing, not sending:', message.subject);
		return;
	}
	const work = email
		.send({ from: FROM, ...message })
		.then(() => undefined)
		.catch((err: unknown) => console.error('lab-desk: email failed', err));
	event.platform?.context?.waitUntil(work);
}

/** Tell the lab instructor someone asked to meet. Reply goes to the student. */
export function notifyMeetingRequested(
	event: Pick<RequestEvent, 'platform' | 'url'>,
	student: { name: string; email: string },
	request: { topic: string; availability: string }
): void {
	const link = `${event.url.origin}/lab#desk`;
	const text = [
		`${student.name} (${student.email}) asked to meet.`,
		'',
		'About:',
		request.topic,
		'',
		'When they are free:',
		request.availability || '(not given)',
		'',
		`Answer on the lab desk: ${link}`,
		'Replying to this email goes to the student.'
	].join('\n');
	const html = shell(
		`${student.name} asked to meet`,
		`<p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7a7364;">About</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.55;">${esc(request.topic)}</p>
    <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7a7364;">When they are free</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${esc(request.availability || '(not given)')}</p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #e2ded4;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a7364;">From ${esc(student.email)}. Replying to this email goes to them. Or answer on the <a href="${link}" style="color:#1a1a1a;">lab desk</a>.</p>`
	);
	sendLater(event, {
		to: LAB_CONTACT.email,
		replyTo: student.email,
		subject: `Meeting request from ${student.name}`,
		text,
		html
	});
}

/** Tell the student the instructor answered. */
export function notifyMeetingAnswered(
	event: Pick<RequestEvent, 'platform' | 'url'>,
	studentEmail: string,
	request: { topic: string; reply: string; status: MeetingStatus }
): void {
	const link = `${event.url.origin}/lab#desk`;
	const headline =
		request.status === 'scheduled'
			? 'Your meeting is scheduled'
			: 'A reply to your meeting request';
	const text = [
		`${LAB_CONTACT.name} answered your request to meet.`,
		'',
		request.reply,
		'',
		'You asked about:',
		request.topic,
		'',
		`See it on the lab desk: ${link}`
	].join('\n');
	const html = shell(
		headline,
		`<p style="margin:0 0 20px;font-size:15px;line-height:1.55;">${esc(request.reply)}</p>
    <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7a7364;">You asked about</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#4a4538;">${esc(request.topic)}</p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #e2ded4;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a7364;">From ${esc(LAB_CONTACT.name)}. Replying to this email goes to them. It is also on the <a href="${link}" style="color:#1a1a1a;">lab desk</a>.</p>`
	);
	sendLater(event, {
		to: studentEmail,
		replyTo: LAB_CONTACT.email,
		subject: headline,
		text,
		html
	});
}
