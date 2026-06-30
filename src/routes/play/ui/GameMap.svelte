<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte'
	import { createEventDispatcher } from 'svelte'
	import type { GameSnapshot } from '@domain/entities'
	import { MapRenderer } from '@infrastructure/map'
	import { getSession, mapResetTick } from '../controller'

	export let snapshot: GameSnapshot
	export let loadingLabel: string

	const dispatch = createEventDispatcher<{ select: string }>()

	let mapEl: HTMLDivElement
	let renderer: MapRenderer | null = null
	let mapReady = false
	let unsubReset: (() => void) | undefined

	async function mountMap() {
		const session = getSession()
		if (!session || renderer) return
		await tick()
		if (!mapEl) return

		mapReady = false
		renderer = new MapRenderer()
		renderer.mount(
			mapEl,
			session.getEra(),
			(id) => dispatch('select', id),
			() => {
				mapReady = true
			}
		)
		renderer.updateStyles(snapshot)
	}

	onMount(() => {
		void mountMap()
		unsubReset = mapResetTick.subscribe(() => renderer?.resetView())
	})

	onDestroy(() => {
		unsubReset?.()
		renderer?.destroy()
		mapReady = false
	})

	$: if (snapshot.status === 'playing') void mountMap()
	$: if (renderer) renderer.updateStyles(snapshot)

	export function flashWrong(id: string): void {
		renderer?.flashWrong(id)
	}
</script>

<div class="relative h-full min-h-[320px] w-full">
	{#if snapshot.status === 'loading' || !mapReady}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-base-100/90 text-base-content">
			{loadingLabel}
		</div>
	{/if}
	<div bind:this={mapEl} class="map-host h-full w-full" class:is-ready={mapReady}></div>
</div>
