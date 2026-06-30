<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { Locale } from '@domain/entities'

	export let currentLocale: Locale

	const dispatch = createEventDispatcher<{ change: void }>()
</script>

<button
	type="button"
	class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
	on:click={() => dispatch('change')}
>
	{currentLocale === 'en' ? 'RU' : 'EN'}
</button>
