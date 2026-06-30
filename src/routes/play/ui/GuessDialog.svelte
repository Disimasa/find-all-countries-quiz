<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { GeoEntity, Locale } from '@domain/entities'

	export let placeholder: string
	export let title: string
	export let results: GeoEntity[] = []
	export let query = ''
	export let locale: Locale

	const dispatch = createEventDispatcher<{
		input: string
		pick: string
		close: void
	}>()

	function onInput(event: Event) {
		const value = (event.target as HTMLInputElement).value
		query = value
		dispatch('input', value)
	}

	function flag(code?: string) {
		if (!code || code.length !== 2) return ''
		return String.fromCodePoint(
			...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
		)
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="font-semibold text-gray-900">{title}</h2>
		<button
			type="button"
			class="text-gray-400 hover:text-gray-600"
			on:click={() => dispatch('close')}
		>
			×
		</button>
	</div>

	<input
		type="text"
		class="mb-2 w-full rounded border border-gray-300 px-3 py-2"
		{placeholder}
		value={query}
		on:input={onInput}
		on:keydown={(e) => e.key === 'Enter' && results[0] && dispatch('pick', results[0].id)}
	/>

	<ul class="max-h-48 overflow-y-auto">
		{#each results as entity (entity.id)}
			<li>
				<button
					type="button"
					class="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-gray-100"
					on:click={() => dispatch('pick', entity.id)}
				>
					<span>{flag(entity.flagCode)}</span>
					<span>{entity.names[locale]}</span>
				</button>
			</li>
		{/each}
	</ul>
</div>
