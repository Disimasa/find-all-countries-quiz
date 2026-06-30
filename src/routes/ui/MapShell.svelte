<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { page } from '$app/stores'
	import { initMapShell, mapShellReady, mapShellTransitioning } from '../map_shell'

	let mapEl: HTMLDivElement

	$: mapInteractive = $page.url.pathname === '/play' && !$mapShellTransitioning

	onMount(() => {
		void initMapShell(mapEl)
	})

	onDestroy(() => {
		mapShellReady.set(false)
	})
</script>

<div class="pointer-events-none fixed inset-0 z-0 bg-base-200">
	<div
		bind:this={mapEl}
		class="map-host h-full w-full"
		class:is-ready={$mapShellReady}
		class:pointer-events-auto={mapInteractive}
	></div>
	<div
		class="map-vignette absolute inset-0 pointer-events-none transition-[background-color,opacity] duration-700"
		class:map-vignette-active={$mapShellTransitioning}
	></div>
</div>
