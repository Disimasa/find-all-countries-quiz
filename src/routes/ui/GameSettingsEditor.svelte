<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { Locale } from '@domain/entities'
	import { TIMER_MINUTE_PRESETS } from '@domain/session/constants'
	import SegmentedRow from './SegmentedRow.svelte'

	const TIMER_OPTIONS = TIMER_MINUTE_PRESETS.filter((m) => m !== 10 && m !== 45)
	const LIVES_OPTIONS = [1, 3, 5] as const
	const LOCALE_OPTIONS: Locale[] = ['en', 'ru']
	const INFINITE_KEY = 'infinite'

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

	$: localeOptions = LOCALE_OPTIONS.map((locale) => ({
		key: locale,
		label: locale.toUpperCase(),
		active: currentLocale === locale
	}))

	$: timerOptions = [
		...TIMER_OPTIONS.map((minutes) => ({
			key: String(minutes),
			label: String(minutes),
			active: timerOn && timerMinutes === minutes
		})),
		{
			key: INFINITE_KEY,
			label: '∞',
			active: !timerOn,
			title: infiniteLabel
		}
	]

	$: livesOptions = [
		...LIVES_OPTIONS.map((count) => ({
			key: String(count),
			label: String(count),
			active: livesOn && maxLives === count
		})),
		{
			key: INFINITE_KEY,
			label: '∞',
			active: !livesOn,
			title: infiniteLabel
		}
	]

	function onTimerSelect(key: string): void {
		if (key === INFINITE_KEY) {
			dispatch('timerSelect', { enabled: false })
			return
		}
		dispatch('timerSelect', { enabled: true, minutes: Number(key) })
	}

	function onLivesSelect(key: string): void {
		if (key === INFINITE_KEY) {
			dispatch('livesSelect', { enabled: false })
			return
		}
		dispatch('livesSelect', { enabled: true, count: Number(key) })
	}
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
		on:select={(event) => onTimerSelect(event.detail)}
	/>

	<span class="text-sm font-medium text-base-content/80">{livesLabel}</span>
	<SegmentedRow
		ariaLabel={livesLabel}
		{disabled}
		options={livesOptions}
		on:select={(event) => onLivesSelect(event.detail)}
	/>
</div>
