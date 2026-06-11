<script lang="ts">
	import { tick } from 'svelte';
	import ChatMessage from './ChatMessage.svelte';
	import { relTime } from '$lib/utils/time';

	interface ChatMessageT {
		role: 'user' | 'assistant';
		content: string;
	}
	interface Conversation {
		id: number;
		title: string;
		created_at: string;
		message_count?: number;
		last_at?: string | null;
		last_snippet?: string;
	}

	interface Props {
		slug: string;
		readingTitle: string;
		readingAuthor: string;
		isMobile: boolean;
		open: boolean;
		onClose: () => void;
		onConversationCount?: (n: number) => void;
	}

	const {
		slug,
		readingTitle,
		readingAuthor,
		isMobile,
		open,
		onClose,
		onConversationCount
	}: Props = $props();

	let chatMessages: ChatMessageT[] = $state([]);
	let chatInput = $state('');
	let chatLoading = $state(false);
	let chatStreaming = $state(false);
	let chatAbort: AbortController | null = $state(null);
	// null = never fetched (show skeleton); [] = fetched, none exist.
	let conversations: Conversation[] | null = $state(null);
	let activeConversationId: number | null = $state(null);
	let chatSelectedText = $state('');
	let chatSelectedPosition: number | null = $state(null);
	let chatEl: HTMLDivElement | undefined = $state();
	let conversationLoading = $state(false);

	// ---- Conversation-list UX state ----
	// The list and the conversation swap inside the same flex slot, so the list
	// DOM is destroyed when a conversation opens. Remember where the user was
	// and put them back there (plus highlight the row they came from).
	let listEl: HTMLDivElement | undefined = $state();
	let savedListScroll = 0;
	let lastViewedId: number | null = $state(null);
	// Two-step delete: first tap arms, second confirms; disarms after a beat.
	let confirmDeleteId: number | null = $state(null);
	let confirmDeleteTimer: ReturnType<typeof setTimeout> | null = null;
	// Inline rename.
	let renamingId: number | null = $state(null);
	let renameValue = $state('');
	// Client-side filter for long lists.
	let filter = $state('');

	const visibleConversations = $derived.by(() => {
		const list = conversations ?? [];
		const q = filter.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(c) =>
				(c.title || '').toLowerCase().includes(q) ||
				(c.last_snippet || '').toLowerCase().includes(q)
		);
	});

	// Response length knob — passed to /api/chat which picks max_tokens and a
	// length-specific instruction in the system prompt. Persists across
	// sessions; the student doesn't have to reset it every time.
	type Length = 'brief' | 'normal' | 'deep';
	const LENGTH_KEY = 'chat-length-v1';
	const initialLength: Length =
		typeof localStorage !== 'undefined'
			? ((localStorage.getItem(LENGTH_KEY) as Length | null) ?? 'normal')
			: 'normal';
	let chatLength: Length = $state(initialLength);
	$effect(() => {
		if (typeof localStorage !== 'undefined') localStorage.setItem(LENGTH_KEY, chatLength);
	});

	// Resizable desktop panel. Width persists across sessions; drag the handle
	// on the left edge. Clamped so the reading column always keeps room.
	const MIN_WIDTH = 300;
	const WIDTH_KEY = 'chat-width-v1';
	function loadWidth(): number {
		if (typeof localStorage === 'undefined') return 384;
		const v = Number(localStorage.getItem(WIDTH_KEY));
		return Number.isFinite(v) && v >= MIN_WIDTH ? v : 384;
	}
	let chatWidth = $state(loadWidth());
	let resizing = $state(false);

	function maxWidth(): number {
		// Leave at least ~360px for the reading itself.
		return typeof window === 'undefined' ? 760 : Math.max(MIN_WIDTH, Math.min(760, window.innerWidth - 360));
	}

	function startResize(e: PointerEvent) {
		e.preventDefault();
		resizing = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onResize(e: PointerEvent) {
		if (!resizing) return;
		// Panel is anchored to the right edge, so width grows as the pointer
		// moves left.
		chatWidth = Math.min(maxWidth(), Math.max(MIN_WIDTH, window.innerWidth - e.clientX));
	}
	function stopResize(e: PointerEvent) {
		if (!resizing) return;
		resizing = false;
		(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
		if (typeof localStorage !== 'undefined') localStorage.setItem(WIDTH_KEY, String(chatWidth));
	}

	const inActiveView = $derived(
		activeConversationId !== null || chatMessages.length > 0 || chatLoading || conversationLoading
	);

	$effect(() => {
		if (open) fetchConversations();
	});

	async function fetchConversations() {
		const res = await fetch(`/api/chat?slug=${encodeURIComponent(slug)}`);
		if (res.ok) {
			conversations = await res.json();
			onConversationCount?.(conversations?.length ?? 0);
		}
	}

	async function backToConversationList() {
		activeConversationId = null;
		chatMessages = [];
		chatSelectedText = '';
		chatSelectedPosition = null;
		// Put the user back exactly where they were in the list. If the row they
		// came from drifted out of view (e.g. the list reordered by activity),
		// bring it into view instead — never strand them at the top.
		await tick();
		if (!listEl) return;
		listEl.scrollTop = savedListScroll;
		if (lastViewedId !== null) {
			const item = listEl.querySelector(`[data-conv-id="${lastViewedId}"]`) as HTMLElement | null;
			if (item) {
				const lr = listEl.getBoundingClientRect();
				const ir = item.getBoundingClientRect();
				if (ir.top < lr.top || ir.bottom > lr.bottom) item.scrollIntoView({ block: 'center' });
			}
		}
	}

	async function loadConversation(id: number) {
		savedListScroll = listEl?.scrollTop ?? savedListScroll;
		lastViewedId = id;
		cancelDelete();
		cancelRename();
		activeConversationId = id;
		chatMessages = [];
		stickToBottom = true;
		conversationLoading = true;
		try {
			const res = await fetch(`/api/chat?id=${id}`);
			if (res.ok) chatMessages = await res.json();
		} finally {
			conversationLoading = false;
			scrollChat();
		}
	}

	function abortChat() {
		chatAbort?.abort();
	}

	async function sendChat() {
		if (!chatInput.trim() || chatLoading || chatStreaming) return;
		const msg = chatInput;
		chatInput = '';
		chatMessages = [
			...chatMessages,
			{ role: 'user', content: msg },
			{ role: 'assistant', content: '' }
		];
		const assistantIdx = chatMessages.length - 1;
		chatLoading = true;
		chatStreaming = true;
		const abort = new AbortController();
		chatAbort = abort;
		scrollChat();

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: abort.signal,
				body: JSON.stringify({
					slug,
					conversationId: activeConversationId,
					message: msg,
					readingTitle,
					readingAuthor,
					selectedText: chatSelectedText || undefined,
					selectedPosition: chatSelectedPosition ?? undefined,
					length: chatLength
				})
			});
			if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let streamFinished = false;
			let receivedAnyDelta = false;
			while (!streamFinished) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				let nl: number;
				while ((nl = buffer.indexOf('\n')) !== -1) {
					const line = buffer.slice(0, nl).trim();
					buffer = buffer.slice(nl + 1);
					if (!line) continue;
					let evt: { type: string; conversationId?: number; text?: string; message?: string };
					try { evt = JSON.parse(line); } catch { continue; }
					if (evt.type === 'init' && evt.conversationId) {
						activeConversationId = evt.conversationId;
						lastViewedId = evt.conversationId;
					} else if (evt.type === 'delta' && evt.text) {
						if (!receivedAnyDelta) {
							receivedAnyDelta = true;
							chatLoading = false;
						}
						chatMessages[assistantIdx].content += evt.text;
						scrollChat();
					} else if (evt.type === 'done') {
						streamFinished = true;
					} else if (evt.type === 'error') {
						chatMessages[assistantIdx].content =
							(chatMessages[assistantIdx].content || '') +
							`\n\n*[error: ${evt.message ?? 'request failed'}]*`;
						streamFinished = true;
					}
				}
			}

			chatSelectedText = '';
			chatSelectedPosition = null;
			fetchConversations();
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				chatMessages[assistantIdx].content =
					(chatMessages[assistantIdx].content || '') + '\n\n*[stopped]*';
				fetchConversations();
			} else {
				chatMessages[assistantIdx].content =
					chatMessages[assistantIdx].content ||
					`*[network error: ${err instanceof Error ? err.message : 'unknown'}]*`;
			}
		} finally {
			chatLoading = false;
			chatStreaming = false;
			chatAbort = null;
			scrollChat();
		}
	}

	// ---- Delete (two-step confirm) ----
	function requestDelete(id: number) {
		cancelRename();
		confirmDeleteId = id;
		if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer);
		confirmDeleteTimer = setTimeout(() => (confirmDeleteId = null), 4000);
	}
	function cancelDelete() {
		if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer);
		confirmDeleteTimer = null;
		confirmDeleteId = null;
	}
	async function deleteConversation(id: number) {
		cancelDelete();
		await fetch(`/api/chat?id=${id}`, { method: 'DELETE' });
		if (activeConversationId === id) {
			activeConversationId = null;
			chatMessages = [];
		}
		if (lastViewedId === id) lastViewedId = null;
		await fetchConversations();
	}

	// ---- Rename (inline) ----
	function startRename(conv: Conversation) {
		cancelDelete();
		renamingId = conv.id;
		renameValue = conv.title || '';
	}
	function cancelRename() {
		renamingId = null;
		renameValue = '';
	}
	async function commitRename() {
		const id = renamingId;
		const title = renameValue.trim();
		if (id === null || !title) {
			cancelRename();
			return;
		}
		cancelRename();
		const res = await fetch(`/api/chat?id=${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title })
		});
		if (res.ok && conversations) {
			conversations = conversations.map((c) => (c.id === id ? { ...c, title } : c));
		}
	}
	// Focus + select the rename input the moment it mounts.
	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	// Exposed to parent via bind:this so the SelectionTooltip "Explain" button
	// can kick off a new chat with the selected passage.
	export function startNewChat(selectedText?: string, selectedPosition?: number) {
		savedListScroll = listEl?.scrollTop ?? savedListScroll;
		activeConversationId = null;
		chatMessages = [];
		chatSelectedText = selectedText || '';
		chatSelectedPosition = selectedPosition ?? null;
		stickToBottom = true;
		if (selectedText) {
			const truncated = selectedText.length > 150
				? selectedText.slice(0, 150) + '...'
				: selectedText;
			chatInput = `Explain this passage: "${truncated}"`;
			sendChat();
		}
		fetchConversations();
	}

	// "Stick to bottom" behavior: auto-scroll while the user is reading the
	// tail of the conversation, but bail out the moment they scroll up to
	// re-read something. Re-engages the moment they scroll back to (near)
	// the bottom — same model as terminals, Twitter, iMessage.
	let stickToBottom = $state(true);
	const STICK_THRESHOLD_PX = 80;

	function scrollChat() {
		requestAnimationFrame(() => {
			if (chatEl && stickToBottom) chatEl.scrollTop = chatEl.scrollHeight;
		});
	}

	function handleChatScroll() {
		if (!chatEl) return;
		const distanceFromBottom = chatEl.scrollHeight - chatEl.clientHeight - chatEl.scrollTop;
		stickToBottom = distanceFromBottom <= STICK_THRESHOLD_PX;
	}

	function jumpToBottom() {
		if (!chatEl) return;
		stickToBottom = true;
		chatEl.scrollTop = chatEl.scrollHeight;
	}
</script>

{#if open}
	{#if isMobile}
		<!-- z-[60] sits above the sticky nav (z-50) so the panel's own
		     close/back buttons aren't hidden behind it. -->
		<div class="fixed inset-0 z-[60] flex flex-col bg-black">
			<div class="flex items-center justify-between border-b border-rule px-4 py-3">
				{#if inActiveView}
					<button onclick={backToConversationList} class="text-xs text-muted hover:text-light">&larr; Back</button>
				{:else}
					<p class="text-xs tracking-widest text-muted uppercase">Chat</p>
				{/if}
				<button onclick={onClose} class="px-2 py-1 text-sm text-muted hover:text-light">&times; Close</button>
			</div>
			{@render body()}
		</div>
	{:else}
		<aside
			class="fixed top-[var(--nav-h,57px)] right-0 bottom-0 z-40 flex flex-col border-l border-rule bg-black {resizing ? 'select-none' : ''}"
			style="width: {chatWidth}px"
		>
			<!-- Drag handle: thin strip on the left edge. Wider invisible hit area
			     than the visible 1px line so it's easy to grab. -->
			<div
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize chat panel"
				onpointerdown={startResize}
				onpointermove={onResize}
				onpointerup={stopResize}
				class="group absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none"
			>
				<div
					class="absolute inset-y-0 left-1 w-px transition-colors {resizing ? 'bg-muted' : 'bg-transparent group-hover:bg-rule'}"
				></div>
			</div>
			<div class="flex items-center justify-between border-b border-rule px-4 py-3">
				{#if inActiveView}
					<button onclick={backToConversationList} class="text-xs text-muted hover:text-light">&larr; Conversations</button>
				{:else}
					<p class="text-xs tracking-widest text-muted uppercase">Chat</p>
				{/if}
				<button onclick={onClose} class="text-sm text-muted hover:text-light">&times;</button>
			</div>
			{@render body()}
		</aside>
	{/if}
{/if}

{#snippet body()}
	{#if !inActiveView}
		<div bind:this={listEl} class="flex-1 overflow-y-auto p-4">
			<button
				onclick={() => startNewChat()}
				class="mb-3 w-full border border-rule px-3 py-2 text-xs text-light transition-colors hover:border-muted hover:text-bright uppercase"
			>
				New conversation
			</button>

			{#if (conversations?.length ?? 0) > 5}
				<input
					type="search"
					bind:value={filter}
					placeholder="Filter conversations…"
					class="mb-3 w-full border border-rule bg-dark px-3 py-1.5 text-xs text-light outline-none placeholder:text-muted focus:border-muted"
				/>
			{/if}

			{#if conversations === null}
				<!-- First load: skeleton rows instead of a flash of "no conversations". -->
				<div class="space-y-4 py-2">
					{#each [85, 65, 75] as w (w)}
						<div class="space-y-2">
							<div class="h-3 animate-pulse rounded bg-rule/40" style="width: {w}%"></div>
							<div class="h-2.5 animate-pulse rounded bg-rule/25" style="width: {w - 20}%"></div>
						</div>
					{/each}
				</div>
			{:else if visibleConversations.length > 0}
				<div>
					{#each visibleConversations as conv (conv.id)}
						<div
							data-conv-id={conv.id}
							class="group/conv border-b border-rule transition-colors {lastViewedId === conv.id
								? 'border-l-2 border-l-muted bg-rule/15 pl-2'
								: ''}"
						>
							{#if renamingId === conv.id}
								<form
									class="flex items-center gap-2 py-3"
									onsubmit={(e) => {
										e.preventDefault();
										commitRename();
									}}
								>
									<input
										use:autofocus
										bind:value={renameValue}
										onkeydown={(e) => {
											if (e.key === 'Escape') {
												e.preventDefault();
												cancelRename();
											}
										}}
										onblur={commitRename}
										maxlength="120"
										class="flex-1 border border-muted bg-dark px-2 py-1 text-sm text-light outline-none"
									/>
									<button type="submit" class="shrink-0 text-xs text-light hover:text-bright">Save</button>
								</form>
							{:else}
								<div class="flex items-start gap-2 py-3">
									<button onclick={() => loadConversation(conv.id)} class="min-w-0 flex-1 text-left">
										<p class="truncate text-sm text-light">{conv.title || 'Untitled'}</p>
										{#if conv.last_snippet}
											<p class="mt-0.5 truncate text-xs text-muted">{conv.last_snippet}</p>
										{/if}
										<p class="mt-1 text-[10px] tracking-wide text-muted/80 uppercase">
											{relTime(conv.last_at ?? conv.created_at)}{#if conv.message_count}&ensp;&middot;&ensp;{conv.message_count} message{conv.message_count === 1 ? '' : 's'}{/if}
										</p>
									</button>
									<div class="flex shrink-0 items-center gap-2 pt-0.5">
										{#if confirmDeleteId === conv.id}
											<button
												onclick={() => deleteConversation(conv.id)}
												class="text-xs text-red-400 hover:text-red-300"
											>
												Delete?
											</button>
											<button onclick={cancelDelete} class="text-xs text-muted hover:text-light">
												Cancel
											</button>
										{:else}
											<button
												onclick={() => startRename(conv)}
												class="text-xs text-muted opacity-0 transition-opacity group-hover/conv:opacity-100 hover:text-light focus:opacity-100"
												aria-label="Rename conversation"
												title="Rename"
											>
												Rename
											</button>
											<button
												onclick={() => requestDelete(conv.id)}
												class="text-xs text-muted hover:text-light"
												aria-label="Delete conversation"
												title="Delete"
											>
												&times;
											</button>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else if filter.trim()}
				<p class="py-2 text-xs text-muted">No conversations match &ldquo;{filter.trim()}&rdquo;.</p>
			{:else}
				<p class="text-xs text-muted">No conversations yet. Select text and click "Explain" to start, or create a new conversation.</p>
			{/if}
		</div>
	{:else}
		<div
			bind:this={chatEl}
			onscroll={handleChatScroll}
			class="flex-1 overflow-y-auto p-4"
		>
			{#if conversationLoading && chatMessages.length === 0}
				<div class="space-y-3">
					{#each [80, 60, 90, 70] as w}
						<div class="h-3 animate-pulse rounded bg-rule/40" style="width: {w}%"></div>
					{/each}
				</div>
			{/if}
			{#each chatMessages as msg, i (i)}
				{#if msg.role !== 'assistant' || msg.content.length > 0}
					<ChatMessage role={msg.role} content={msg.content} />
				{/if}
			{/each}
			{#if chatLoading}
				<div class="mb-4">
					<div class="inline-flex items-center gap-2 rounded-lg bg-dark px-4 py-3">
						<span class="text-xs text-muted">Thinking</span>
						<div class="flex gap-1">
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></span>
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></span>
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if chatStreaming && !stickToBottom}
			<!-- Streaming is mid-flight but the user has scrolled up to read.
			     One-tap re-anchor to the bottom. Sits just above the input
			     so it's reachable without leaving the panel. -->
			<div class="pointer-events-none flex justify-center pb-2">
				<button
					type="button"
					onclick={jumpToBottom}
					class="pointer-events-auto rounded-full border border-rule bg-dark/95 px-3 py-1 text-xs text-light shadow hover:bg-rule/30"
				>
					&darr; Jump to bottom
				</button>
			</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); sendChat(); }} class="border-t border-rule p-3">
			<!-- Response length: brief (quick clarification), normal (graduate
			     seminar default), deep (expansive treatment). Persists in
			     localStorage. -->
			<div class="mb-2 flex items-center gap-1 text-xs">
				<span class="text-muted">Length:</span>
				{#each ['brief', 'normal', 'deep'] as opt (opt)}
					<button
						type="button"
						onclick={() => (chatLength = opt as Length)}
						disabled={chatLoading || chatStreaming}
						class="rounded px-2 py-0.5 capitalize transition-colors {chatLength === opt ? 'bg-rule/50 text-bright' : 'text-muted hover:text-light'} disabled:opacity-50"
					>
						{opt}
					</button>
				{/each}
			</div>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={chatInput}
					placeholder="Ask about this reading..."
					disabled={chatLoading || chatStreaming}
					class="flex-1 border border-rule bg-dark px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-muted disabled:opacity-50"
				/>
				{#if chatStreaming}
					<button
						type="button"
						onclick={abortChat}
						class="border border-rule px-3 py-2 text-xs text-light transition-colors hover:border-muted hover:bg-rule/30 uppercase"
					>
						Stop
					</button>
				{:else}
					<button
						type="submit"
						disabled={!chatInput.trim() || chatLoading}
						class="border border-rule px-3 py-2 text-xs text-muted transition-colors hover:border-muted hover:text-light uppercase disabled:opacity-30"
					>
						Send
					</button>
				{/if}
			</div>
		</form>
	{/if}
{/snippet}
