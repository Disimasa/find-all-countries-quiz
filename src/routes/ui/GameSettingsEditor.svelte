<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { Locale } from '@domain/entities'
	import SegmentedRow from './SegmentedRow.svelte'
	import {
		buildLocaleSegmentOptions,
		buildLivesSegmentOptions,
		buildTimerSegmentOptions,
		parseLivesSelection,
		parseTimerSelection
	} from './game_settings_model.ts'

	export let disabled = false
	export let currentLocale: Locale
	export let timerOn: boolean
	export let livesOn: boolean
	export let timerMinutes: number
	export let maxLives: number
	export let languageLabel: string
	export let timerLabel: string
	export let livesLabel: string
	export let infiniteLabel: string

	const dispatch = createEventDispatcher<{
		localeSelect: Locale
		timerSelect: { enabled: boolean; minutes?: number }
		livesSelect: { enabled: boolean; count?: number }
	}>()

	$: localeOptions = buildLocaleSegmentOptions(currentLocale)
	$: timerOptions = buildTimerSegmentOptions(timerOn, timerMinutes, infiniteLabel)
	$: livesOptions = buildLivesSegmentOptions(livesOn, maxLives, infiniteLabel)
</script>

<div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
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
