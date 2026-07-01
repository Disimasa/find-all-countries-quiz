<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { page } from '$app/stores'
	import {
		activateLobbyMode,
		initMapShell,
		mapShellReady,
		mapShellTransitioning,
		runLobbyTeaserWhenReady,
		stopLobbyMapOverlays
	} from '../map_shell'

	let mapEl: HTMLDivElement

	$: mapPointerEvents =
		($page.url.pathname === '/' || $page.url.pathname === '/play') && !$mapShellTransitioning
	$: lobbyMapOn = $page.url.pathname === '/' && $mapShellReady && !$mapShellTransitioning

	$: if (lobbyMapOn) {
		void activateLobbyMode()
		void runLobbyTeaserWhenReady()
	} else {
		stopLobbyMapOverlays()
	}

	onMount(() => {
		void initMapShell(mapEl)
	})

	onDestroy(() => {
		stopLobbyMapOverlays()
		mapShellReady.set(false)
	})
</script>

<div class="pointer-events-none fixed inset-0 z-0 bg-base-200">
	<div
		bind:this={mapEl}
		class="h-full w-full [&_.maplibregl-canvas]:outline-none [&_.maplibregl-map]:size-full [&_.maplibregl-map]:font-[inherit] [&_.maplibregl-marker]:z-[2]"
		class:[&_.maplibregl-canvas]:invisible={!$mapShellReady}
		class:pointer-events-auto={mapPointerEvents}
	></div>
	<div
		class="absolute inset-0 z-[1] pointer-events-none transition-[background-color,opacity] duration-700 {$mapShellTransitioning
			? 'bg-base-300/40'
			: 'bg-base-100/15'}"
	></div>
</div>
