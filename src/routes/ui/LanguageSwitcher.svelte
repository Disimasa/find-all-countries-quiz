<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { Locale } from '@domain/entities'

	export let currentLocale: Locale

	const dispatch = createEventDispatcher<{ change: void }>()
</script>

<button
	type="button"
	class="btn btn-sm btn-outline rounded-lg border-primary/45 px-2.5 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary"
	on:click={() => dispatch('change')}
>
	{currentLocale === 'en' ? 'RU' : 'EN'}
</button>
