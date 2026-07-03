<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { page } from '$app/stores'
	import {
		activateExploreMode,
		activateLobbyMode,
		activeEraTheme,
		initMapShell,
		mapShellReady,
		mapShellTransitioning,
		runLobbyTeaserWhenReady,
		stopLobbyMapOverlays
	} from '../map_shell'
	import MapEraDecorations from './MapEraDecorations.svelte'
	import { locale } from '@i18n'

	let mapEl: HTMLDivElement

	$: mapPointerEvents =
		($page.url.pathname === '/' ||
			$page.url.pathname === '/play' ||
			$page.url.pathname === '/explore') &&
		!$mapShellTransitioning
	$: lobbyMapOn = $page.url.pathname === '/' && $mapShellReady && !$mapShellTransitioning
	$: exploreMapOn = $page.url.pathname === '/explore' && $mapShellReady && !$mapShellTransitioning

	$: if (lobbyMapOn) {
		void activateLobbyMode()
		void runLobbyTeaserWhenReady()
	} else if (exploreMapOn) {
		void activateExploreMode($locale)
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
		data-testid="map-shell"
		class="h-full w-full [&_.maplibregl-canvas]:outline-none [&_.maplibregl-map]:size-full [&_.maplibregl-map]:font-[inherit] [&_.maplibregl-marker]:z-[2]"
		class:[&_.maplibregl-canvas]:invisible={!$mapShellReady}
		class:pointer-events-auto={mapPointerEvents}
	></div>
	<MapEraDecorations show={$activeEraTheme.decorations.paperGrain === true} />
	<div
		class="absolute inset-0 z-[1] pointer-events-none transition-[background-color,opacity] duration-700 {$mapShellTransitioning
			? 'bg-base-300/40'
			: 'bg-base-100/15'}"
	></div>
</div>
