<script lang="ts">
	import { onMount } from 'svelte'
	import { closeDialog } from 'svelte-awaitable-dialog'
	import type { GameSnapshot } from '@domain/entities'

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
		window.location.href = '/'
	}

	function playAgain() {
		closeDialog()
		window.location.reload()
	}
</script>

<dialog bind:this={dialog} class="rounded-lg border-0 p-0 shadow-xl backdrop:bg-black/40">
	<div class="space-y-4 p-6 text-center">
		<h2 class="text-2xl font-bold">
			{snapshot.status === 'won' ? victoryTitle : gameOverTitle}
		</h2>
		<p class="text-gray-600">
			{snapshot.progress.correct} / {snapshot.progress.total}
		</p>
		<div class="flex justify-center gap-3">
			<button
				type="button"
				class="rounded bg-pink-500 px-4 py-2 text-white hover:bg-pink-600"
				on:click={playAgain}
			>
				{playAgainLabel}
			</button>
			<button
				type="button"
				class="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
				on:click={goHome}
			>
				{homeLabel}
			</button>
		</div>
	</div>
</dialog>
