<script lang="ts">
	import { browser } from '$app/environment'
	import 'maplibre-gl/dist/maplibre-gl.css'
	import { AwaitableDialog } from 'svelte-awaitable-dialog'
	import './layout.css'
	import favicon from '$lib/assets/favicon.svg'
	import MapShell from './ui/MapShell.svelte'
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if browser}
	<MapShell />
{/if}

<div class="relative z-10 h-screen overflow-hidden pointer-events-none">
	<slot />
</div>

<AwaitableDialog />
