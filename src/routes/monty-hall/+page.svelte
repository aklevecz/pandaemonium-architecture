<script lang="ts">
	import { page } from '$app/state';
	// The Monty Hall problem, played and simulated.
	//
	// Three doors; a pickup truck behind one, Elon Musk behind the other two.
	// You pick a door. The host, who knows where the truck is, opens one of
	// the other two doors to reveal Musk, then offers you the chance to
	// switch. Switching wins 2/3 of the time; staying wins 1/3.

	type Phase = 'pick' | 'offer' | 'reveal';

	const DOORS = [0, 1, 2] as const;

	// ---- Interactive game ---------------------------------------------------

	let truck = $state(rand3());
	let picked = $state<number | null>(null);
	let opened = $state<number | null>(null);
	let finalPick = $state<number | null>(null);
	let choice = $state<'stay' | 'switch' | null>(null);
	let phase = $state<Phase>('pick');

	// Running tallies across rounds, split by strategy.
	let tally = $state({
		stay: { wins: 0, played: 0 },
		switch: { wins: 0, played: 0 }
	});

	function rand3() {
		return Math.floor(Math.random() * 3);
	}

	// Host opens a Musk door that isn't the player's pick. When the player has
	// picked the truck, the host has two Musk doors to choose from and picks
	// one at random; otherwise there is exactly one door he can open.
	function hostOpens(truckDoor: number, pickDoor: number) {
		const options = DOORS.filter((d) => d !== truckDoor && d !== pickDoor);
		return options[Math.floor(Math.random() * options.length)];
	}

	function pick(d: number) {
		if (phase !== 'pick') return;
		picked = d;
		opened = hostOpens(truck, d);
		phase = 'offer';
	}

	function decide(c: 'stay' | 'switch') {
		if (phase !== 'offer' || picked === null || opened === null) return;
		choice = c;
		finalPick = c === 'stay' ? picked : (DOORS.find((d) => d !== picked && d !== opened) as number);
		const won = finalPick === truck;
		tally[c].played += 1;
		if (won) tally[c].wins += 1;
		phase = 'reveal';
	}

	function nextRound() {
		truck = rand3();
		picked = null;
		opened = null;
		finalPick = null;
		choice = null;
		phase = 'pick';
	}

	function resetTally() {
		tally = { stay: { wins: 0, played: 0 }, switch: { wins: 0, played: 0 } };
	}

	let won = $derived(phase === 'reveal' && finalPick === truck);

	// ---- Bulk simulation ----------------------------------------------------

	let simN = $state(1000);
	let sim = $state<{ n: number; stayWins: number; switchWins: number } | null>(null);
	let simHistory = $state<{ n: number; stay: number; switch: number }[]>([]);

	function simulate(n: number) {
		let stayWins = 0;
		let switchWins = 0;
		for (let i = 0; i < n; i++) {
			const c = rand3();
			const p = rand3();
			const o = hostOpens(c, p);
			const sw = DOORS.find((d) => d !== p && d !== o) as number;
			if (p === c) stayWins++;
			if (sw === c) switchWins++;
		}
		sim = { n, stayWins, switchWins };
		simHistory = [...simHistory, { n, stay: stayWins / n, switch: switchWins / n }].slice(-8);
	}

	function pct(w: number, p: number) {
		return p === 0 ? '—' : `${Math.round((w / p) * 100)}%`;
	}

	// When the deck opened this page, ?lab and ?slide say which slide — the
	// back link returns there rather than to the top of the presentation.
	const backHref = $derived.by(() => {
		const lab = page.url.searchParams.get('lab');
		const slide = page.url.searchParams.get('slide');
		if (!lab) return '/';
		return `/lab/${lab}${slide ? `?s=${slide}` : ''}`;
	});
	const backLabel = $derived.by(() => {
		const lab = page.url.searchParams.get('lab');
		const slide = page.url.searchParams.get('slide');
		if (!lab) return 'Back';
		return `Lab ${lab.padStart(2, '0')}${slide ? ` · slide ${slide.padStart(2, '0')}` : ''}`;
	});
</script>

<svelte:head>
	<title>The Monty Hall Problem · Pandaemonium Architecture</title>
</svelte:head>

<!-- Engraved line-art prizes, drawn to sit with the book faces rather than
     the OS emoji set. Stroked in currentColor so they follow the theme. -->
{#snippet truckArt()}
	<svg
		viewBox="0 0 132 66"
		class="h-auto w-16 text-bright sm:w-28"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path
			d="M8 48 L8 28.5 C8 27.5 8.8 27 10 27 L48.5 27 C49.6 27 50.2 26.4 50.2 25.2 L50.2 13 C50.2 11.2 51.6 10 54 10 L86 10 C88.4 10 89.8 10.9 90.8 12.6 L98 26 L119 26.5 C122.6 26.8 124.5 28.6 124.5 32 L124.5 48 L112 48 A13 13 0 0 0 86 48 L45 48 A13 13 0 0 0 19 48 L8 48 Z"
		/>
		<path d="M56 14 L72.5 14 L72.5 24 L56 24 Z" stroke-width="1.3" />
		<path d="M76 14 L84.5 14 L92.5 24 L76 24 Z" stroke-width="1.3" />
		<path d="M50.2 27.5 L50.2 46.5" stroke-width="1.2" />
		<path d="M11 30.5 H47.5" stroke-width="1.1" opacity="0.5" />
		<path d="M60 31.5 L66 31.2" stroke-width="1.1" />
		<path d="M48 50.5 H84" stroke-width="1.2" opacity="0.6" />
		<path d="M118.5 30 L124 30.8 L124 34 L118.5 33.2 Z" stroke-width="1.3" />
		<circle cx="32" cy="48" r="11" />
		<circle cx="99" cy="48" r="11" />
		<circle cx="32" cy="48" r="3.4" stroke-width="1.3" />
		<circle cx="99" cy="48" r="3.4" stroke-width="1.3" />
		<!-- oval badge on the bed side -->
		<ellipse cx="17.5" cy="37.5" rx="4.2" ry="2.3" stroke-width="1.2" />
		<path d="M14 60 H120" stroke-width="1.1" opacity="0.35" />
	</svg>
{/snippet}

{#snippet muskArt()}
	<svg
		viewBox="0 0 132 92"
		class="h-auto w-14 text-muted sm:w-24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<!-- one outer contour: hair silhouette over the crown, jaw below -->
		<path
			d="M45 36 C44 21 52 9 66 9 C80 9 88 21 87 36 C87 47 83 55 76 59 C72 61.5 60 61.5 56 59 C49 55 45 47 45 36 Z"
		/>
		<!-- hairline across the forehead, slight peak at the centre -->
		<path
			d="M47 30 C51 24 57 21 62 21.5 C64 21.7 65.5 22.5 66 23.5 C66.5 22.5 68 21.7 70 21.5 C75 21 81 24 85 30"
			stroke-width="1.3"
		/>
		<path d="M56 14 C60 11.5 66 11 70 12" stroke-width="1.1" opacity="0.6" />
		<path d="M73 12.5 C77 13.5 80 16 82 19" stroke-width="1.1" opacity="0.6" />
		<!-- ears -->
		<path d="M45 36 C42 34 41 40 44 44" stroke-width="1.3" />
		<path d="M87 36 C90 34 91 40 88 44" stroke-width="1.3" />
		<!-- brows and eyes -->
		<path d="M54 31.5 C57 29.5 61 29.8 63.5 31" stroke-width="1.3" />
		<path d="M68.5 31 C71 29.8 75 29.5 78 31.5" stroke-width="1.3" />
		<circle cx="59" cy="35.5" r="1.3" fill="currentColor" stroke="none" />
		<circle cx="73" cy="35.5" r="1.3" fill="currentColor" stroke="none" />
		<!-- nose -->
		<path d="M66 36 C65 41 64 44 63.5 46 C65 47.5 67.5 47.5 69 46" stroke-width="1.3" />
		<!-- smirk, off centre -->
		<path d="M59 52.5 C63 55 70 55 74.5 51.5" stroke-width="1.4" />
		<!-- neck -->
		<path d="M59 60.5 L59 70" />
		<path d="M73 60.5 L73 70" />
		<!-- blazer over a t-shirt -->
		<path d="M10 92 C13 79 32 70 59 70" />
		<path d="M122 92 C119 79 100 70 73 70" />
		<path d="M59 70 L50 92" stroke-width="1.4" />
		<path d="M73 70 L82 92" stroke-width="1.4" />
		<path d="M59 70 C61 76.5 71 76.5 73 70" stroke-width="1.3" />
	</svg>
{/snippet}

<div class="mx-auto max-w-3xl px-4 sm:px-6">
	<header class="pt-12 pb-8">
		<a href={backHref} class="text-xs text-muted uppercase transition-colors hover:text-white"
			>&larr; {backLabel}</a
		>
		<h1 class="mt-8 font-serif text-4xl font-normal text-bright">The Monty Hall Problem</h1>
		<p class="mt-3 max-w-xl font-serif text-base leading-relaxed text-gray">
			Three doors. A pickup truck behind one, Elon Musk behind the other two. You pick a door. The
			host, who knows where the truck is, opens one of the <em>other</em> doors to show you Elon Musk,
			then asks: do you want to switch?
		</p>
	</header>

	<!-- ------------------------------------------------------------ Game -->
	<section class="rounded border border-rule p-5 sm:p-6">
		<div class="flex items-baseline justify-between gap-4">
			<p class="text-[10px] tracking-widest text-muted uppercase">Play</p>
			<p class="min-h-4 font-serif text-sm text-muted" aria-live="polite">
				{#if phase === 'pick'}
					Pick a door.
				{:else if phase === 'offer'}
					The host opens door {(opened ?? 0) + 1}: Elon Musk. Stay with door {(picked ?? 0) + 1}, or
					switch?
				{:else if won}
					You {choice === 'switch' ? 'switched' : 'stayed'} and
					<span class="text-bright">won the truck.</span>
				{:else}
					You {choice === 'switch' ? 'switched' : 'stayed'} and got Elon Musk. The truck was behind door
					{truck + 1}.
				{/if}
			</p>
		</div>

		<div class="mt-6 grid grid-cols-3 gap-3 sm:gap-5">
			{#each DOORS as d (d)}
				{@const isOpen = phase === 'reveal' || opened === d}
				{@const isPicked = phase === 'reveal' ? finalPick === d : picked === d}
				{@const isTruck = truck === d}
				<button
					type="button"
					onclick={() => pick(d)}
					disabled={phase !== 'pick'}
					aria-label={`Door ${d + 1}`}
					class="group relative flex aspect-[3/4] flex-col items-center justify-center rounded border px-1 pb-7 transition-colors
						{isPicked ? 'border-bright' : 'border-rule'}
						{phase === 'pick' ? 'cursor-pointer hover:border-muted hover:bg-rule/20' : 'cursor-default'}
						{isOpen ? 'bg-dark' : 'bg-ink'}"
				>
					<span class="absolute top-2 left-3 text-[10px] tracking-widest text-muted uppercase"
						>{d + 1}</span
					>
					{#if isOpen}
						{@render (isTruck ? truckArt : muskArt)()}
						<span class="mt-2 text-[10px] tracking-widest text-muted uppercase"
							>{isTruck ? 'Pickup truck' : 'Elon Musk'}</span
						>
					{:else}
						<span
							class="h-2 w-2 rounded-full transition-colors {isPicked
								? 'bg-bright'
								: 'bg-rule group-hover:bg-muted'}"
							aria-hidden="true"
						></span>
					{/if}
					{#if isPicked}
						<span
							class="absolute bottom-2 text-[9px] tracking-widest text-light uppercase sm:text-[10px]"
						>
							{phase === 'reveal' ? 'Final pick' : 'Your pick'}
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="mt-6 flex min-h-9 flex-wrap items-center gap-3">
			{#if phase === 'offer'}
				<button
					type="button"
					onclick={() => decide('stay')}
					class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
				>
					Stay with {(picked ?? 0) + 1}
				</button>
				<button
					type="button"
					onclick={() => decide('switch')}
					class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
				>
					Switch to {(DOORS.find((d) => d !== picked && d !== opened) ?? 0) + 1}
				</button>
			{:else if phase === 'reveal'}
				<button
					type="button"
					onclick={nextRound}
					class="rounded border border-rule px-4 py-2 text-xs tracking-wide text-light uppercase transition-colors hover:border-muted hover:text-bright"
				>
					Play again
				</button>
			{/if}
		</div>

		<!-- Tally -->
		<div class="mt-8 border-t border-rule pt-5">
			<div class="flex items-baseline justify-between">
				<p class="text-[10px] tracking-widest text-muted uppercase">Your record</p>
				{#if tally.stay.played + tally.switch.played > 0}
					<button
						type="button"
						onclick={resetTally}
						class="text-[10px] tracking-widest text-muted uppercase transition-colors hover:text-white"
					>
						Reset
					</button>
				{/if}
			</div>
			<dl class="mt-3 grid grid-cols-2 gap-4 font-serif">
				<div>
					<dt class="text-xs text-muted">Stayed</dt>
					<dd class="mt-1 text-2xl text-bright">{pct(tally.stay.wins, tally.stay.played)}</dd>
					<dd class="text-xs text-muted">{tally.stay.wins} of {tally.stay.played} won</dd>
				</div>
				<div>
					<dt class="text-xs text-muted">Switched</dt>
					<dd class="mt-1 text-2xl text-bright">{pct(tally.switch.wins, tally.switch.played)}</dd>
					<dd class="text-xs text-muted">{tally.switch.wins} of {tally.switch.played} won</dd>
				</div>
			</dl>
		</div>
	</section>

	<!-- ------------------------------------------------------- Simulation -->
	<section class="mt-8 rounded border border-rule p-5 sm:p-6">
		<p class="text-[10px] tracking-widest text-muted uppercase">Simulate</p>
		<p class="mt-2 font-serif text-sm leading-relaxed text-gray">
			A few rounds by hand won't settle it. Run the game many times with a random pick each round
			and compare the two strategies.
		</p>
		<div class="mt-4 flex flex-wrap items-center gap-2">
			{#each [100, 1000, 10000, 100000] as n (n)}
				<button
					type="button"
					onclick={() => {
						simN = n;
						simulate(n);
					}}
					class="rounded border px-3 py-1.5 text-xs tracking-wide uppercase transition-colors hover:border-muted hover:text-bright
						{sim?.n === n ? 'border-bright text-bright' : 'border-rule text-light'}"
				>
					{n.toLocaleString()} games
				</button>
			{/each}
		</div>

		{#if sim}
			{@const stayP = sim.stayWins / sim.n}
			{@const switchP = sim.switchWins / sim.n}
			<div class="mt-6 space-y-4 font-serif">
				<div>
					<div class="flex items-baseline justify-between text-xs">
						<span class="text-muted">Stay</span>
						<span class="text-light">{(stayP * 100).toFixed(1)}%</span>
					</div>
					<div class="mt-1 h-2 w-full overflow-hidden rounded-sm bg-dark">
						<div
							class="h-full bg-muted transition-[width] duration-300"
							style="width: {stayP * 100}%"
						></div>
					</div>
				</div>
				<div>
					<div class="flex items-baseline justify-between text-xs">
						<span class="text-muted">Switch</span>
						<span class="text-light">{(switchP * 100).toFixed(1)}%</span>
					</div>
					<div class="mt-1 h-2 w-full overflow-hidden rounded-sm bg-dark">
						<div
							class="h-full bg-bright transition-[width] duration-300"
							style="width: {switchP * 100}%"
						></div>
					</div>
				</div>
				<p class="text-xs text-muted">
					{sim.n.toLocaleString()} games · stay won {sim.stayWins.toLocaleString()}, switch won {sim.switchWins.toLocaleString()}.
					Expected: 33.3% and 66.7%.
				</p>
			</div>

			{#if simHistory.length > 1}
				<div class="mt-5 border-t border-rule pt-4">
					<p class="text-[10px] tracking-widest text-muted uppercase">Recent runs</p>
					<table class="mt-2 w-full font-serif text-xs">
						<thead>
							<tr class="text-muted">
								<th class="py-1 text-left font-normal">Games</th>
								<th class="py-1 text-right font-normal">Stay</th>
								<th class="py-1 text-right font-normal">Switch</th>
							</tr>
						</thead>
						<tbody>
							{#each simHistory as r, i (i)}
								<tr class="border-t border-rule/50 text-light">
									<td class="py-1">{r.n.toLocaleString()}</td>
									<td class="py-1 text-right">{(r.stay * 100).toFixed(1)}%</td>
									<td class="py-1 text-right">{(r.switch * 100).toFixed(1)}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	</section>

	<!-- ------------------------------------------------------------- Why -->
	<section class="prose mt-12 pb-24">
		<h2>Why switching wins</h2>
		<p>
			Your first pick is right one time in three. That never changes: nothing the host does
			afterward moves the truck. So two times in three the truck is behind one of the two doors you
			<em>didn't</em> pick, and the host, who must open a door with Elon Musk behind it and can't open
			yours, is forced to show you exactly which of those two it isn't. Switching is a bet that your first
			guess was wrong, and it usually was.
		</p>
		<p>
			The trap is treating the host's reveal as fresh, neutral information: "two doors left, so it's
			fifty-fifty." But the host isn't opening a random door. He's constrained by knowledge you
			don't have, and that constraint leaks information about the door he chose <em>not</em>
			to open. If a door had been opened at random (and happened not to reveal the truck), the odds really
			would be even.
		</p>
		<p>
			It helps to imagine a hundred doors. You pick one; the host opens ninety-eight Elon Musks and
			leaves one door closed. Do you keep your 1-in-100 guess, or take the door he conspicuously
			skipped?
		</p>
		<h3>Enumerate it</h3>
		<table>
			<thead>
				<tr
					><th>Truck is behind</th><th>You pick 1</th><th>Host opens</th><th>Stay</th><th>Switch</th
					></tr
				>
			</thead>
			<tbody>
				<tr><td>1</td><td>1</td><td>2 or 3</td><td>Win</td><td>Lose</td></tr>
				<tr><td>2</td><td>1</td><td>3</td><td>Lose</td><td>Win</td></tr>
				<tr><td>3</td><td>1</td><td>2</td><td>Lose</td><td>Win</td></tr>
			</tbody>
		</table>
		<p>
			Each row is equally likely. Stay wins in one of the three; switch wins in two. The same table
			holds whichever door you start with.
		</p>
	</section>
</div>
