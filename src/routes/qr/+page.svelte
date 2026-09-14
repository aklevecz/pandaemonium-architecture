<script lang="ts">
	// A QR code for the course home page, big enough to scan from the back of
	// A211H when projected. Always points at the atek639 domain, whichever
	// domain this page is served from, so the code on the wall matches the
	// address students are given.
	const HOME = 'https://atek639.calarts.app/';
</script>

<svelte:head><title>Share the course site · Pandaemonium Architecture</title></svelte:head>

<div class="mx-auto flex max-w-3xl flex-col items-center px-4 pt-12 pb-16 text-center sm:px-6">
	<a href="/" class="self-start text-xs text-muted uppercase transition-colors hover:text-white"
		>&larr; Back</a
	>
	<h1 class="mt-8 font-serif text-4xl font-normal text-bright">Scan for the course site</h1>
	<div class="mt-8 w-full max-w-[min(80vh,32rem)] bg-white p-4">
		<img src="/qr/atek639-home.svg" alt="QR code linking to {HOME}" class="block h-auto w-full" />
	</div>
	<p class="mt-6 font-mono text-lg text-light">atek639.calarts.app</p>
	<p class="mt-6 font-mono text-xs text-muted">
		Download:
		<a href="/qr/atek639-home.png" download class="underline hover:text-white">PNG</a>
		·
		<a href="/qr/atek639-home.svg" download class="underline hover:text-white">SVG</a>
	</p>
</div>
