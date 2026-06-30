<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { page } from '$app/stores'
	import ProgressPanel from './ui/ProgressPanel.svelte'
	import {
		autocompleteResults,
		clearSelection,
		destroyGame,
		formatTime,
		gameSnapshot,
		getSession,
		parseConfig,
		resetMapView,
		selectCountry,
		submitGuess,
		updateAutocomplete
	} from './controller'
	import { locale, t } from '@i18n'
	import { loadSavedGame } from '@persist'
	import {
		enterPlayDirect,
		flashWrongOnMap,
		mapShellReady,
		mapShellTransitioning,
		setMapSelectHandler,
		transitionToHome,
		updateMapStyles
	} from '../map_shell'

	let guessQuery = ''
	let wrongPulse = 0

	onMount(() => {
		setMapSelectHandler(onSelect)

		if (!$mapShellTransitioning && !getSession()) {
			const saved = loadSavedGame()
			if (saved) {
				void enterPlayDirect(saved.config, { resume: saved.progress })
			} else {
				const config = parseConfig($page.url.search)
				void enterPlayDirect(config)
			}
		}
	})

	$: if (session) session.setLocale($locale)
	$: updateMapStyles($gameSnapshot)

	onDestroy(() => {
		setMapSelectHandler(null)
		if (!$mapShellTransitioning) destroyGame()
	})

	function onSelect(id: string) {
		selectCountry(id)
		guessQuery = ''
		updateAutocomplete('')
	}

	function onGuessInput(value: string) {
		guessQuery = value
		updateAutocomplete(value)
	}

	function onWrongAnswer(countryId: string) {
		flashWrongOnMap(countryId)
		wrongPulse += 1
	}

	function onGuessPick(id: string) {
		const result = submitGuess(id)
		if (result && !result.correct) onWrongAnswer(result.expectedId)
		guessQuery = ''
		updateAutocomplete('')
	}

	function onGuessClose() {
		clearSelection()
	}

	function onEnd() {
		void transitionToHome()
	}

	$: formattedTime = formatTime($gameSnapshot.timeRemaining)
	$: session = ($gameSnapshot.status, getSession())
	$: mapLoading =
		($gameSnapshot.status === 'loading' || !$mapShellReady) && !$mapShellTransitioning
	$: panelRevealed = !$mapShellTransitioning && !mapLoading
</script>

<div class="pointer-events-none relative h-full overflow-hidden">
	{#if mapLoading}
		<div
			class="pointer-events-none absolute inset-0 z-5 flex items-center justify-center bg-base-100/40 text-base-content backdrop-blur-[1px]"
		>
			{$t('loading')}
		</div>
	{/if}

	<div
		class="absolute inset-0 overflow-hidden"
		class:pointer-events-none={!panelRevealed}
		class:opacity-0={!panelRevealed}
		class:translate-x-6={!panelRevealed}
		class:opacity-100={panelRevealed}
		class:translate-x-0={panelRevealed}
		class:transition-[opacity,transform]={panelRevealed}
		class:duration-600={panelRevealed}
		class:ease-out={panelRevealed}
	>
		<ProgressPanel
		snapshot={$gameSnapshot}
		correctLabel={$t('correct')}
		remainingLabel={$t('remaining')}
		livesLabel={$t('livesLabel')}
		timeLabel={$t('time')}
		progressLabel={$t('progress')}
		{formattedTime}
		resetLabel={$t('resetView')}
		endLabel={$t('endQuiz')}
		guessPlaceholder={$t('guessPlaceholder')}
		selectCountryHint={$t('selectCountryHint')}
		{guessQuery}
		autocompleteResults={$autocompleteResults}
		{wrongPulse}
		on:reset={resetMapView}
		on:end={onEnd}
		on:guessInput={(e) => onGuessInput(e.detail)}
		on:guessPick={(e) => onGuessPick(e.detail)}
		on:guessClose={onGuessClose}
		/>
	</div>
</div>
