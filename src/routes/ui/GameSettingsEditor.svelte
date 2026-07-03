<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { Locale } from '@domain/entities'
	import { PREWW1_ERA_ID } from '@domain/maps'
	import SegmentedRow from './SegmentedRow.svelte'
	import {
		buildEraSegmentOptions,
		buildLocaleSegmentOptions,
		buildLivesSegmentOptions,
		buildTimerSegmentOptions,
		parseLivesSelection,
		parseTimerSelection
	} from './game_settings_model.ts'

	export let disabled = false
	export let currentLocale: Locale
	export let currentEraId: string
	export let timerOn: boolean
	export let livesOn: boolean
	export let timerMinutes: number
	export let maxLives: number
	export let eraLabel: string
	export let eraModernLabel: string
	export let eraPreWW1Label: string
	export let eraPreWW1Hint = ''
	export let languageLabel: string
	export let timerLabel: string
	export let livesLabel: string
	export let infiniteLabel: string
	export let lobbyPanelTint: string | undefined = undefined

	const dispatch = createEventDispatcher<{
		localeSelect: Locale
		eraSelect: string
		timerSelect: { enabled: boolean; minutes?: number }
		livesSelect: { enabled: boolean; count?: number }
	}>()

	$: eraLabels = { eraModern: eraModernLabel, eraPreWW1: eraPreWW1Label }
	$: localeOptions = buildLocaleSegmentOptions(currentLocale)
	$: eraOptions = buildEraSegmentOptions(currentEraId, eraLabels)
	$: timerOptions = buildTimerSegmentOptions(timerOn, timerMinutes, infiniteLabel)
	$: livesOptions = buildLivesSegmentOptions(livesOn, maxLives, infiniteLabel)
</script>

<div
	class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3"
	style:background-color={lobbyPanelTint ? `${lobbyPanelTint}40` : undefined}
>
	<span class="text-sm font-medium text-base-content/80 mb-auto mt-1.5">{eraLabel}</span>
	<div class="flex flex-col gap-1">
		<SegmentedRow
			ariaLabel={eraLabel}
			{disabled}
			options={eraOptions}
			on:select={(event) => dispatch('eraSelect', event.detail)}
		/>
		{#if currentEraId === PREWW1_ERA_ID && eraPreWW1Hint}
			<p class="text-[10px] leading-snug text-base-content/55">{eraPreWW1Hint}</p>
		{/if}
	</div>

	<span class="text-sm font-medium text-base-content/80">{languageLabel}</span>
	<SegmentedRow
		ariaLabel={languageLabel}
		{disabled}
		options={localeOptions}
		on:select={(event) => dispatch('localeSelect', event.detail as Locale)}
	/>

	<span class="text-sm font-medium text-base-content/80">{timerLabel}</span>
	<SegmentedRow
		ariaLabel={timerLabel}
		{disabled}
		options={timerOptions}
		on:select={(event) => dispatch('timerSelect', parseTimerSelection(event.detail))}
	/>

	<span class="text-sm font-medium text-base-content/80">{livesLabel}</span>
	<SegmentedRow
		ariaLabel={livesLabel}
		{disabled}
		options={livesOptions}
		on:select={(event) => dispatch('livesSelect', parseLivesSelection(event.detail))}
	/>
</div>
