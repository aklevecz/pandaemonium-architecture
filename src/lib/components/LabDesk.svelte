<script lang="ts">
	// The lab desk: contact, meeting requests, and the Fuser sign-up sheet.
	// Everything it shows came from the server for this viewer specifically;
	// after each change it reloads that data rather than patching local copies.
	import { invalidateAll } from '$app/navigation';
	import { relTime } from '$lib/utils/time';
	import type { FuserSheetRow, MeetingRequest } from '$lib/server/lab-desk';

	interface Desk {
		contact: { name: string; email: string };
		accountEmail: string;
		isInstructor: boolean;
		myMeetings: MeetingRequest[];
		fuserSheet: FuserSheetRow[];
		allMeetings: MeetingRequest[] | null;
	}
	let { desk }: { desk: Desk } = $props();

	let busy = $state(false);
	// Notices render beside the part of the desk that caused them, so a
	// confirmation for the Fuser sheet doesn't appear a screen above it.
	type Where = 'contact' | 'meet' | 'fuser' | 'instructor';
	let notice = $state<{ text: string; error: boolean; where: Where } | null>(null);
	function say(where: Where, text: string, error = false) {
		notice = { text, error, where };
	}

	async function call(where: Where, url: string, method: string, body?: unknown): Promise<boolean> {
		if (busy) return false;
		busy = true;
		notice = null;
		try {
			const res = await fetch(url, {
				method,
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined
			});
			if (!res.ok) {
				const detail = await res
					.json()
					.then((j) => j?.message as string | undefined)
					.catch(() => undefined);
				say(where, detail || `Something went wrong (${res.status})`, true);
				return false;
			}
			await invalidateAll();
			return true;
		} catch {
			say(where, 'Could not reach the server', true);
			return false;
		} finally {
			busy = false;
		}
	}

	// --- Contact -----------------------------------------------------------------
	let copied = $state(false);
	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			say('contact', 'Could not copy', true);
		}
	}

	// --- Meetings ----------------------------------------------------------------
	let topic = $state('');
	let availability = $state('');
	async function requestMeeting() {
		if (!topic.trim()) return;
		if (await call('meet', '/api/lab/meetings', 'POST', { topic, availability })) {
			topic = '';
			availability = '';
			say('meet', `Sent. ${desk.contact.name} has been emailed and will answer here and by email.`);
		}
	}
	const statusLabel: Record<string, string> = {
		open: 'Waiting for a reply',
		scheduled: 'Scheduled',
		done: 'Done'
	};

	// --- Fuser -------------------------------------------------------------------
	const mine = $derived(desk.fuserSheet.find((r) => r.mine));
	let editingFuser = $state(false);
	// svelte-ignore state_referenced_locally
	let fuserEmail = $state(desk.accountEmail);
	let fuserNote = $state('');
	function startEditFuser() {
		fuserEmail = mine?.fuserEmail ?? desk.accountEmail;
		fuserNote = mine?.note ?? '';
		editingFuser = true;
	}
	async function signUpFuser() {
		if (await call('fuser', '/api/lab/fuser', 'POST', { fuserEmail, note: fuserNote })) {
			editingFuser = false;
			say('fuser', 'You are on the sheet.');
		}
	}
	const pendingEmails = $derived(
		desk.fuserSheet
			.filter((r) => r.status === 'requested' && r.fuserEmail)
			.map((r) => r.fuserEmail!)
	);

	// --- Instructor --------------------------------------------------------------
	let replies = $state<Record<number, string>>({});
	function replyDraft(m: MeetingRequest) {
		return replies[m.id] ?? m.reply;
	}
	const openCount = $derived(desk.allMeetings?.filter((m) => m.status === 'open').length ?? 0);

	const label = 'text-xs tracking-widest text-muted uppercase';
	const field =
		'w-full border border-rule bg-dark px-3 py-2 font-serif text-sm text-white outline-none placeholder:text-muted focus:border-muted';
	const pill =
		'rounded-full border border-muted px-4 py-1.5 text-xs text-bright transition-colors hover:bg-rule/50 disabled:cursor-not-allowed disabled:opacity-40';
	const quiet = 'text-xs text-muted transition-colors hover:text-light';
</script>

{#snippet noticeAt(where: Where)}
	{#if notice?.where === where}
		<p class="mt-3 text-xs {notice.error ? 'text-red-300' : 'text-light'}" role="status">
			{notice.text}
		</p>
	{/if}
{/snippet}

<section id="desk" class="scroll-mt-24 border-t border-rule py-10">
	<p class={label}>Lab desk</p>

	<!-- Contact -->
	<div class="mt-6">
		<p class="font-serif text-lg text-light">{desk.contact.name}</p>
		<p class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
			<a
				href="mailto:{desk.contact.email}"
				class="font-mono text-sm break-all text-gray underline decoration-rule underline-offset-4 transition-colors hover:text-bright"
				>{desk.contact.email}</a
			>
			<button type="button" onclick={() => copy(desk.contact.email)} class={quiet}
				>{copied ? 'Copied' : 'Copy'}</button
			>
		</p>
		<p class="mt-2 max-w-xl font-serif text-sm leading-relaxed text-muted">
			Email for anything about the labs{desk.isInstructor ? '.' : ', or ask for time below.'}
		</p>
		{@render noticeAt('contact')}
	</div>

	<!-- Request a meeting. The instructor answers requests further down
	     and has no use for asking themself. -->
	{#if !desk.isInstructor}
		<div class="mt-10">
			<p class={label}>Ask to meet</p>
			<form
				class="mt-3 max-w-xl space-y-3"
				onsubmit={(e) => {
					e.preventDefault();
					requestMeeting();
				}}
			>
				<textarea
					bind:value={topic}
					rows="3"
					maxlength="600"
					placeholder="What would you like to meet about?"
					aria-label="What would you like to meet about?"
					class="{field} resize-none"
				></textarea>
				<input
					bind:value={availability}
					maxlength="400"
					placeholder="When are you free? e.g. Tue or Thu after 2, or before lab"
					aria-label="When are you free?"
					class={field}
				/>
				<button type="submit" disabled={busy || !topic.trim()} class={pill}>Send request</button>
			</form>
			{@render noticeAt('meet')}

			{#if desk.myMeetings.length > 0}
				<ul class="mt-6 max-w-xl space-y-5">
					{#each desk.myMeetings as m (m.id)}
						<li class="border-l-2 pl-4 {m.status === 'open' ? 'border-rule' : 'border-muted'}">
							<p class="text-xs text-muted">
								<span class={m.status === 'scheduled' ? 'text-bright' : 'text-light'}
									>{statusLabel[m.status]}</span
								>
								<span class="text-muted/60">&middot;</span>
								asked {relTime(m.created_at)}
							</p>
							<p class="mt-1 font-serif text-sm leading-relaxed whitespace-pre-line text-gray">
								{m.topic}
							</p>
							{#if m.availability}
								<p class="mt-1 text-xs text-muted">Free: {m.availability}</p>
							{/if}
							{#if m.reply}
								<p class="mt-2 font-serif text-sm leading-relaxed whitespace-pre-line text-bright">
									{desk.contact.name}: {m.reply}
								</p>
							{/if}
							{#if m.status === 'open'}
								<button
									type="button"
									disabled={busy}
									onclick={() => call('meet', `/api/lab/meetings?id=${m.id}`, 'DELETE')}
									class="mt-2 {quiet}">Withdraw</button
								>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<!-- Fuser sign-up sheet -->
	<div id="fuser" class="mt-12 scroll-mt-24">
		<p class={label}>
			Fuser access
			{#if desk.fuserSheet.length > 0}
				<span class="ml-1 text-muted/60">{desk.fuserSheet.length}</span>
			{/if}
		</p>
		<p class="mt-3 max-w-xl font-serif text-sm leading-relaxed text-gray">
			Sign up here for access to <a
				href="https://fuser.studio/"
				target="_blank"
				rel="noopener"
				class="text-light underline decoration-rule underline-offset-4 hover:text-bright">Fuser</a
			> for the labs. Give the email your Fuser account uses. Classmates see your name on the sheet, not
			your address.
		</p>

		{#if !mine || editingFuser}
			<form
				class="mt-4 max-w-xl space-y-3"
				onsubmit={(e) => {
					e.preventDefault();
					signUpFuser();
				}}
			>
				<input
					bind:value={fuserEmail}
					type="email"
					required
					autocomplete="email"
					placeholder="Email on your Fuser account"
					aria-label="Email on your Fuser account"
					class={field}
				/>
				<input
					bind:value={fuserNote}
					maxlength="300"
					placeholder="Anything to add? (optional)"
					aria-label="Note (optional)"
					class={field}
				/>
				<div class="flex items-baseline gap-4">
					<button type="submit" disabled={busy || !fuserEmail.trim()} class={pill}
						>{mine ? 'Save' : 'Sign me up'}</button
					>
					{#if editingFuser}
						<button type="button" onclick={() => (editingFuser = false)} class={quiet}
							>Cancel</button
						>
					{/if}
				</div>
			</form>
		{:else}
			<p class="mt-4 text-sm text-light">
				{mine.status === 'granted' ? 'Access granted' : 'You are on the sheet'}
				<span class="text-muted">as</span>
				<span class="font-mono text-xs break-all">{mine.fuserEmail}</span>
			</p>
			{#if mine.status === 'granted'}
				<p class="mt-1 text-xs text-muted">Check that inbox for the invite from Fuser.</p>
			{/if}
			<p class="mt-2 flex gap-4">
				<button type="button" onclick={startEditFuser} class={quiet}>Change email</button>
				<button
					type="button"
					disabled={busy}
					onclick={() => call('fuser', '/api/lab/fuser', 'DELETE')}
					class={quiet}>Take me off</button
				>
			</p>
		{/if}

		{@render noticeAt('fuser')}

		{#if desk.fuserSheet.length > 0 && !desk.isInstructor}
			<ol class="mt-6 max-w-xl divide-y divide-rule border-y border-rule">
				{#each desk.fuserSheet as r, i (r.id)}
					<li class="flex items-baseline justify-between gap-4 py-2">
						<span class="text-sm {r.mine ? 'text-bright' : 'text-gray'}">
							<span class="mr-3 font-mono text-xs text-muted tabular-nums"
								>{String(i + 1).padStart(2, '0')}</span
							>{r.name}{r.mine ? ' (you)' : ''}
						</span>
						<span class="text-xs {r.status === 'granted' ? 'text-light' : 'text-muted'}"
							>{r.status === 'granted' ? 'Granted' : 'Requested'}</span
						>
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	<!-- Instructor -->
	{#if desk.isInstructor && desk.allMeetings}
		<div class="mt-14 border-t border-rule pt-8">
			{@render noticeAt('instructor')}
			<p class={label}>
				Instructor &middot; meeting requests
				<span class="ml-1 text-muted/60">{openCount} open</span>
			</p>
			{#if desk.allMeetings.length === 0}
				<p class="mt-3 text-xs text-muted">No requests yet.</p>
			{:else}
				<ul class="mt-4 space-y-6">
					{#each desk.allMeetings as m (m.id)}
						<li class="border-l-2 pl-4 {m.status === 'open' ? 'border-muted' : 'border-rule'}">
							<p class="text-xs text-muted">
								<span class="text-light">{m.student?.name}</span>
								<a
									href="mailto:{m.student?.email}"
									class="ml-1 font-mono break-all no-underline hover:text-light"
									>{m.student?.email}</a
								>
								<span class="text-muted/60">&middot;</span>
								{relTime(m.created_at)}
								<span class="text-muted/60">&middot;</span>
								{m.status}
							</p>
							<p class="mt-1 font-serif text-sm leading-relaxed whitespace-pre-line text-gray">
								{m.topic}
							</p>
							{#if m.availability}
								<p class="mt-1 text-xs text-muted">Free: {m.availability}</p>
							{/if}
							<textarea
								value={replyDraft(m)}
								oninput={(e) => (replies[m.id] = e.currentTarget.value)}
								rows="2"
								maxlength="600"
								placeholder="Reply with a time and place. The student is emailed."
								aria-label="Reply to {m.student?.name}"
								class="{field} mt-2 max-w-xl resize-none"
							></textarea>
							<div class="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
								<button
									type="button"
									disabled={busy || !replyDraft(m).trim()}
									onclick={() =>
										call('instructor', '/api/lab/meetings', 'PUT', {
											id: m.id,
											reply: replyDraft(m),
											status: 'scheduled'
										})}
									class={pill}>Reply &amp; mark scheduled</button
								>
								{#if m.status !== 'done'}
									<button
										type="button"
										disabled={busy}
										onclick={() =>
											call('instructor', '/api/lab/meetings', 'PUT', { id: m.id, status: 'done' })}
										class={quiet}>Mark done</button
									>
								{:else}
									<button
										type="button"
										disabled={busy}
										onclick={() =>
											call('instructor', '/api/lab/meetings', 'PUT', { id: m.id, status: 'open' })}
										class={quiet}>Reopen</button
									>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<p class="{label} mt-12">
				Instructor &middot; Fuser sheet
				<span class="ml-1 text-muted/60">{pendingEmails.length} waiting</span>
			</p>
			{#if desk.fuserSheet.length === 0}
				<p class="mt-3 text-xs text-muted">Nobody has signed up yet.</p>
			{:else}
				{#if pendingEmails.length > 0}
					<button type="button" onclick={() => copy(pendingEmails.join(', '))} class="mt-3 {quiet}"
						>{copied ? 'Copied' : `Copy the ${pendingEmails.length} waiting addresses`}</button
					>
				{/if}
				<div class="mt-3 overflow-x-auto">
					<table class="w-full min-w-[32rem] border-y border-rule text-left text-xs">
						<tbody class="divide-y divide-rule">
							{#each desk.fuserSheet as r (r.id)}
								<tr>
									<td class="py-2 pr-4 text-light">{r.name}</td>
									<td class="py-2 pr-4 font-mono text-gray">{r.fuserEmail}</td>
									<td class="py-2 pr-4 text-muted">
										{#if r.accountEmail && r.accountEmail !== r.fuserEmail}signs in as {r.accountEmail}{/if}
										{#if r.note}<span class="block text-gray">{r.note}</span>{/if}
									</td>
									<td class="py-2 text-right whitespace-nowrap">
										<button
											type="button"
											disabled={busy}
											onclick={() =>
												call('instructor', '/api/lab/fuser', 'PUT', {
													id: r.id,
													status: r.status === 'granted' ? 'requested' : 'granted'
												})}
											class={r.status === 'granted' ? 'text-light hover:text-muted' : quiet}
											>{r.status === 'granted' ? 'Granted ✓' : 'Mark granted'}</button
										>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</section>
