<script lang="ts">
	import ChatMessage from './ChatMessage.svelte';

	interface ChatMessageT {
		role: 'user' | 'assistant';
		content: string;
	}
	interface Conversation {
		id: number;
		title: string;
		created_at: string;
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
	let conversations: Conversation[] = $state([]);
	let activeConversationId: number | null = $state(null);
	let chatSelectedText = $state('');
	let chatEl: HTMLDivElement | undefined = $state();
	let conversationLoading = $state(false);

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
			onConversationCount?.(conversations.length);
		}
	}

	function backToConversationList() {
		activeConversationId = null;
		chatMessages = [];
		chatSelectedText = '';
	}

	async function loadConversation(id: number) {
		activeConversationId = id;
		chatMessages = [];
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
					selectedText: chatSelectedText || undefined
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

	async function deleteConversation(id: number) {
		await fetch(`/api/chat?id=${id}`, { method: 'DELETE' });
		if (activeConversationId === id) {
			activeConversationId = null;
			chatMessages = [];
		}
		await fetchConversations();
	}

	// Exposed to parent via bind:this so the SelectionTooltip "Explain" button
	// can kick off a new chat with the selected passage.
	export function startNewChat(selectedText?: string) {
		activeConversationId = null;
		chatMessages = [];
		chatSelectedText = selectedText || '';
		if (selectedText) {
			const truncated = selectedText.length > 150
				? selectedText.slice(0, 150) + '...'
				: selectedText;
			chatInput = `Explain this passage: "${truncated}"`;
			sendChat();
		}
		fetchConversations();
	}

	function scrollChat() {
		requestAnimationFrame(() => {
			if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
		});
	}
</script>

{#if open}
	{#if isMobile}
		<div class="fixed inset-0 z-40 flex flex-col bg-black">
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
		<aside class="fixed top-[57px] right-0 bottom-0 z-40 flex w-80 flex-col border-l border-rule bg-black">
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
		<div class="flex-1 overflow-y-auto p-4">
			<button
				onclick={() => startNewChat()}
				class="mb-4 w-full border border-rule px-3 py-2 text-xs text-light transition-colors hover:border-muted hover:text-bright uppercase"
			>
				New conversation
			</button>
			{#if conversations.length > 0}
				<div class="space-y-2">
					{#each conversations as conv (conv.id)}
						<div class="flex items-start gap-2 border-b border-rule py-3">
							<button onclick={() => loadConversation(conv.id)} class="flex-1 text-left">
								<p class="text-sm text-light">{conv.title || 'Untitled'}</p>
								<p class="mt-0.5 text-xs text-muted">{new Date(conv.created_at).toLocaleDateString()}</p>
							</button>
							<button
								onclick={() => deleteConversation(conv.id)}
								class="shrink-0 text-xs text-muted hover:text-light"
							>
								&times;
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-muted">No conversations yet. Select text and click "Explain" to start, or create a new conversation.</p>
			{/if}
		</div>
	{:else}
		<div bind:this={chatEl} class="flex-1 overflow-y-auto p-4">
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

		<form onsubmit={(e) => { e.preventDefault(); sendChat(); }} class="border-t border-rule p-3">
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
