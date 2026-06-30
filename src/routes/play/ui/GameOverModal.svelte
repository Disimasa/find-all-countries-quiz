<script lang="ts">
	import { get } from 'svelte/store'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { closeDialog } from 'svelte-awaitable-dialog'
	import type { GameSnapshot } from '@domain/entities'
	import { parseConfig, startGame } from '../controller'
	import { transitionToHome } from '../../map_shell'

	export let snapshot: GameSnapshot
	export let victoryTitle: string
	export let gameOverTitle: string
	export let playAgainLabel: string
	export let homeLabel: string

	let dialog: HTMLDialogElement

	onMount(() => {
		dialog?.showModal()
	})

	function goHome() {
		closeDialog()
		void transitionToHome()
	}

	function playAgain() {
		closeDialog()
		const config = parseConfig(get(page).url.search)
		void startGame(config)
	}
</script>

<dialog
	bind:this={dialog}
	class="fixed top-1/2 left-1/2 m-0 w-[min(100vw-2rem,20rem)] -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 shadow-none backdrop:bg-black/40"
>
	<div class="rounded-2xl border border-base-300/80 bg-base-100 p-6 text-center shadow-xl">
		<h2 class="text-2xl font-bold text-base-content">
			{snapshot.status === 'won' ? victoryTitle : gameOverTitle}
		</h2>
		<p class="mt-2 text-base-content/65">
			{snapshot.progress.correct} / {snapshot.progress.total}
		</p>
		<div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
			<button type="button" class="btn btn-primary flex-1 rounded-xl sm:flex-none" on:click={playAgain}>
				{playAgainLabel}
			</button>
			<button
				type="button"
				class="btn btn-outline flex-1 rounded-xl border-primary/45 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary sm:flex-none"
				on:click={goHome}
			>
				{homeLabel}
			</button>
		</div>
	</div>
</dialog>
