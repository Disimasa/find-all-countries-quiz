<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import GameSettingsEditor from './GameSettingsEditor.svelte'
	import type { Locale } from '@domain/entities'
	import IconPlay from '~icons/lucide/play'
	import { activeEraTheme, mapEraSwitching, mapShellTransitioning } from '../map_shell'

	export let title: string
	export let modeHint: string
	export let eraLabel: string
	export let eraModernLabel: string
	export let eraPreWW1Label: string
	export let eraPreWW1Hint = ''
	export let timerLabel: string
	export let livesLabel: string
	export let infiniteLabel: string
	export let languageLabel: string
	export let startLabel: string
	export let continueLabel = ''
	export let disclaimer: string
	export let currentEraId: string
	export let timerOn: boolean
	export let livesOn: boolean
	export let timerMinutes: number
	export let maxLives: number
	export let currentLocale: Locale

	const dispatch = createEventDispatcher<{
		start: void
		continue: void
		eraSelect: string
		timerSelect: { enabled: boolean; minutes?: number }
		livesSelect: { enabled: boolean; count?: number }
		localeSelect: Locale
	}>()

	$: settingsDisabled = $mapShellTransitioning || $mapEraSwitching
	$: lobbyPanelTint = $activeEraTheme.decorations.lobbyPanelTint
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
			class="flex flex-col gap-2 rounded-2xl border border-base-300/80 bg-base-100/95 p-4 shadow-lg backdrop-blur-md transition-colors duration-500"
			style:background-color={lobbyPanelTint ? `${lobbyPanelTint}cc` : undefined}
		>
			<GameSettingsEditor
				disabled={settingsDisabled}
				{currentLocale}
				{currentEraId}
				{timerOn}
				{livesOn}
				{timerMinutes}
				{maxLives}
				{eraLabel}
				{eraModernLabel}
				{eraPreWW1Label}
				{eraPreWW1Hint}
				{languageLabel}
				{timerLabel}
				{livesLabel}
				{infiniteLabel}
				{lobbyPanelTint}
				on:localeSelect={(event) => dispatch('localeSelect', event.detail)}
				on:eraSelect={(event) => dispatch('eraSelect', event.detail)}
				on:timerSelect={(event) => dispatch('timerSelect', event.detail)}
				on:livesSelect={(event) => dispatch('livesSelect', event.detail)}
			/>

			{#if continueLabel}
				<button
					type="button"
					data-testid="continue-game"
					class="btn btn-primary rounded-lg mt-1 w-full gap-2"
					disabled={settingsDisabled}
					on:click={() => dispatch('continue')}
				>
					<IconPlay class="size-4" />
					{continueLabel}
				</button>
				<button
					type="button"
					class="btn btn-outline w-full rounded-lg border-primary/45 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary"
					disabled={settingsDisabled}
					on:click={() => dispatch('start')}
				>
					{startLabel}
				</button>
			{:else}
				<button
					type="button"
					class="btn btn-primary rounded-lg mt-1 w-full gap-2"
					disabled={settingsDisabled}
					on:click={() => dispatch('start')}
				>
					<IconPlay class="size-4" />
					{startLabel}
				</button>
			{/if}

			<p class="text-center text-[10px] leading-snug text-base-content/45">{disclaimer}</p>
		</section>
	</div>
</div>
