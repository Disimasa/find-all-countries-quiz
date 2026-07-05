<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { Locale } from '@domain/entities'
	import EraPicker from './EraPicker.svelte'
	import LocalePicker from './LocalePicker.svelte'
	import SegmentedRow from './SegmentedRow.svelte'
	import {
		buildEraPickerOptions,
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
	export let eraLabels: Record<string, string> = {}
	export let eraHints: Record<string, string> = {}
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

	$: eraOptions = buildEraPickerOptions(currentEraId, eraLabels, eraHints)
	$: timerOptions = buildTimerSegmentOptions(timerOn, timerMinutes, infiniteLabel)
	$: livesOptions = buildLivesSegmentOptions(livesOn, maxLives, infiniteLabel)
</script>

<div
	class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3"
	style:background-color={lobbyPanelTint ? `${lobbyPanelTint}40` : undefined}
>
	<span class="col-span-2 flex items-center justify-between gap-2">
		<span class="text-sm font-medium text-base-content/80">{eraLabel}</span>
		<LocalePicker
			ariaLabel={languageLabel}
			{disabled}
			{currentLocale}
			on:select={(event) => dispatch('localeSelect', event.detail)}
		/>
	</span>
	<div class="col-span-2">
		<EraPicker
			ariaLabel={eraLabel}
			{disabled}
			options={eraOptions}
			on:select={(event) => dispatch('eraSelect', event.detail)}
		/>
	</div>

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
