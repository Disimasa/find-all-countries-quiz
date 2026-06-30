<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte'
	import { createEventDispatcher } from 'svelte'
	import type { GameSnapshot } from '@domain/entities'
	import { LeafletMapRenderer } from '@infrastructure/map'
	import { getSession, mapResetTick } from '../controller'

	export let snapshot: GameSnapshot
	export let loadingLabel: string

	const dispatch = createEventDispatcher<{ select: string }>()

	let mapEl: HTMLDivElement
	let renderer: LeafletMapRenderer | null = null
	let unsubReset: (() => void) | undefined

	async function mountMap() {
		const session = getSession()
		if (!session || renderer) return
		await tick()
		if (!mapEl) return

		renderer = new LeafletMapRenderer()
		renderer.mount(mapEl, session.getEra(), (id) => dispatch('select', id))
		renderer.updateStyles(snapshot)
	}

	onMount(() => {
		void mountMap()
		unsubReset = mapResetTick.subscribe(() => renderer?.resetView())
	})

	onDestroy(() => {
		unsubReset?.()
		renderer?.destroy()
	})

	$: if (snapshot.status === 'playing') void mountMap()
	$: if (renderer) renderer.updateStyles(snapshot)
</script>

<div class="relative h-full min-h-[320px] w-full">
	{#if snapshot.status === 'loading'}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-gray-600">
			{loadingLabel}
		</div>
	{/if}
	<div bind:this={mapEl} class="h-full w-full"></div>
</div>

<style>
	:global(.leaflet-container) {
		height: 100%;
		width: 100%;
		font-family: inherit;
	}
</style>
