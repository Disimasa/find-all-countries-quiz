<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import LanguageSwitcher from './LanguageSwitcher.svelte'
	import type { Locale } from '@domain/entities'

	export let title: string
	export let subtitle: string
	export let timerLabel: string
	export let livesLabel: string
	export let startLabel: string
	export let disclaimer: string
	export let timerOn: boolean
	export let livesOn: boolean
	export let currentLocale: Locale

	const dispatch = createEventDispatcher<{
		start: void
		toggleTimer: void
		toggleLives: void
		changeLocale: void
	}>()
</script>

<main class="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
	<header class="space-y-2 text-center">
		<h1 class="text-3xl font-bold text-gray-900">{title}</h1>
		<p class="text-gray-600">{subtitle}</p>
	</header>

	<div class="flex justify-center">
		<LanguageSwitcher {currentLocale} on:change={() => dispatch('changeLocale')} />
	</div>

	<div class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				checked={timerOn}
				on:change={() => dispatch('toggleTimer')}
				class="size-4"
			/>
			<span>{timerLabel}</span>
		</label>
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				checked={livesOn}
				on:change={() => dispatch('toggleLives')}
				class="size-4"
			/>
			<span>{livesLabel}</span>
		</label>
	</div>

	<button
		type="button"
		class="rounded-lg bg-pink-500 px-4 py-3 font-semibold text-white hover:bg-pink-600"
		on:click={() => dispatch('start')}
	>
		{startLabel}
	</button>

	<p class="text-center text-xs text-gray-500">{disclaimer}</p>
</main>
