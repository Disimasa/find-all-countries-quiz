<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import LanguageSwitcher from './LanguageSwitcher.svelte'
	import type { Locale } from '@domain/entities'
	import IconPlay from '~icons/lucide/play'
	import { mapShellTransitioning } from '../map_shell'

	export let title: string
	export let modeHint: string
	export let timerLabel: string
	export let livesLabel: string
	export let languageLabel: string
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

<div
	class="pointer-events-none flex min-h-screen items-center justify-center p-4 md:items-start md:justify-end md:p-6 md:pt-10"
>
	<div
		class="pointer-events-auto flex w-full max-w-70 flex-col gap-3 lg:max-w-72"
		class:opacity-0={$mapShellTransitioning}
		class:translate-y-3={$mapShellTransitioning}
		class:scale-[0.97]={$mapShellTransitioning}
		class:pointer-events-none={$mapShellTransitioning}
		class:opacity-100={!$mapShellTransitioning}
		class:translate-y-0={!$mapShellTransitioning}
		class:scale-100={!$mapShellTransitioning}
		class:transition-[opacity,transform]={!$mapShellTransitioning}
		class:duration-600={!$mapShellTransitioning}
		class:ease-out={!$mapShellTransitioning}
	>
		<section
			class="rounded-2xl border border-base-300/80 bg-base-100/95 p-4 shadow-lg backdrop-blur-md"
		>
			<h1 class="text-xl font-bold leading-tight text-base-content">{title}</h1>
			<p class="mt-1.5 text-sm leading-snug text-base-content/65">{modeHint}</p>
		</section>

		<section
			class="flex flex-col gap-3 rounded-2xl border border-base-300/80 bg-base-100/95 p-4 shadow-lg backdrop-blur-md"
		>
			<div class="flex items-center justify-between gap-3">
				<span class="text-sm text-base-content/70">{languageLabel}</span>
				<LanguageSwitcher {currentLocale} on:change={() => dispatch('changeLocale')} />
			</div>

			<label class="flex cursor-pointer items-center justify-between gap-3">
				<span class="text-sm">{timerLabel}</span>
				<input
					type="checkbox"
					class="toggle toggle-sm toggle-primary"
					checked={timerOn}
					disabled={$mapShellTransitioning}
					on:change={() => dispatch('toggleTimer')}
				/>
			</label>

			<label class="flex cursor-pointer items-center justify-between gap-3">
				<span class="text-sm">{livesLabel}</span>
				<input
					type="checkbox"
					class="toggle toggle-sm toggle-primary"
					checked={livesOn}
					disabled={$mapShellTransitioning}
					on:change={() => dispatch('toggleLives')}
				/>
			</label>

			<button
				type="button"
				class="btn btn-primary mt-1 w-full gap-2 rounded-xl"
				disabled={$mapShellTransitioning}
				on:click={() => dispatch('start')}
			>
				<IconPlay class="size-4" />
				{startLabel}
			</button>

			<p class="text-center text-[10px] leading-snug text-base-content/45">{disclaimer}</p>
		</section>
	</div>
</div>
