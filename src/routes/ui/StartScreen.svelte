<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import GameSettingsEditor from './GameSettingsEditor.svelte'
	import type { Locale } from '@domain/entities'
	import IconPlay from '~icons/lucide/play'
	import IconShare2 from '~icons/lucide/share-2'
	import { activeEraTheme, mapEraSwitching, mapShellTransitioning } from '../map_shell'

	export let title: string
	export let modeHint: string
	export let eraLabel: string
	export let eraLabels: Record<string, string> = {}
	export let eraHints: Record<string, string> = {}
	export let timerLabel: string
	export let livesLabel: string
	export let infiniteLabel: string
	export let languageLabel: string
	export let startLabel: string
	export let continueLabel = ''
	export let shareLabel: string
	export let shareCopiedLabel: string
	export let shareHint: string
	export let shareCopied = false
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
		share: void
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
				{eraLabels}
				{eraHints}
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
					class="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content shadow-sm ring-1 ring-primary/25 transition-[background-color,box-shadow,transform] hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
					disabled={settingsDisabled}
					on:click={() => dispatch('continue')}
				>
					<IconPlay class="size-4" />
					{continueLabel}
				</button>
				<button
					type="button"
					class="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-[background-color,border-color] hover:border-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
					disabled={settingsDisabled}
					on:click={() => dispatch('start')}
				>
					<IconPlay class="size-4" />
					{startLabel}
				</button>
			{:else}
				<button
					type="button"
					class="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content shadow-sm ring-1 ring-primary/25 transition-[background-color,box-shadow,transform] hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
					disabled={settingsDisabled}
					on:click={() => dispatch('start')}
				>
					<IconPlay class="size-4" />
					{startLabel}
				</button>
			{/if}

			<button
				type="button"
				data-testid="share-game"
				class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-base-300/70 px-2 py-2 text-[11px] font-medium text-base-content/65 transition-colors hover:bg-base-200/80 hover:text-base-content disabled:pointer-events-none disabled:opacity-40"
				title={shareHint}
				disabled={settingsDisabled}
				on:click={() => dispatch('share')}
			>
				<IconShare2 class="size-3.5 shrink-0" />
				<span>{shareCopied ? shareCopiedLabel : shareLabel}</span>
			</button>

			<p class="text-center text-[10px] leading-snug text-base-content/45">{disclaimer}</p>
		</section>
	</div>
</div>
