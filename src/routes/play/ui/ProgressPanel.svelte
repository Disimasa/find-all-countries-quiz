<script lang="ts">
	import type { GameSnapshot } from '@domain/entities'

	export let snapshot: GameSnapshot
	export let correctLabel: string
	export let remainingLabel: string
	export let livesLabel: string
	export let timeLabel: string
	export let formattedTime: string
	export let resetLabel: string
	export let endLabel: string

	import { createEventDispatcher } from 'svelte'
	const dispatch = createEventDispatcher<{ reset: void; end: void }>()
</script>

<aside class="flex h-full flex-col gap-4 border-l border-gray-200 bg-white p-4">
	<div class="grid grid-cols-2 gap-3 text-sm">
		<div class="rounded bg-green-50 p-3">
			<div class="text-gray-500">{correctLabel}</div>
			<div class="text-2xl font-bold text-green-700">{snapshot.progress.correct}</div>
		</div>
		<div class="rounded bg-gray-50 p-3">
			<div class="text-gray-500">{remainingLabel}</div>
			<div class="text-2xl font-bold">{snapshot.progress.total - snapshot.progress.correct}</div>
		</div>
		<div class="rounded bg-red-50 p-3">
			<div class="text-gray-500">{livesLabel}</div>
			<div class="text-2xl font-bold text-red-600">{snapshot.lives}</div>
		</div>
		<div class="rounded bg-blue-50 p-3">
			<div class="text-gray-500">{timeLabel}</div>
			<div class="text-2xl font-bold text-blue-700">{formattedTime}</div>
		</div>
	</div>

	<div class="mt-auto flex flex-col gap-2">
		<button
			type="button"
			class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
			on:click={() => dispatch('reset')}
		>
			{resetLabel}
		</button>
		<button
			type="button"
			class="rounded border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
			on:click={() => dispatch('end')}
		>
			{endLabel}
		</button>
	</div>
</aside>
