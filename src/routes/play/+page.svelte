<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import GameMap from './ui/GameMap.svelte'
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
		startGame,
		submitGuess,
		updateAutocomplete
	} from './controller'
	import { locale, t } from '@i18n'

	let guessQuery = ''
	let wrongPulse = 0
	let gameMap: GameMap

	onMount(() => {
		const config = parseConfig($page.url.search)
		void startGame(config)
	})

	$: if (session) session.setLocale($locale)

	onDestroy(() => destroyGame())

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
		gameMap?.flashWrong(countryId)
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

	$: formattedTime = formatTime($gameSnapshot.timeRemaining)
	$: session = ($gameSnapshot.status, getSession())
</script>

<div class="relative h-screen">
	<GameMap
		bind:this={gameMap}
		snapshot={$gameSnapshot}
		loadingLabel={$t('loading')}
		on:select={(e) => onSelect(e.detail)}
	/>

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
		on:end={() => goto('/')}
		on:guessInput={(e) => onGuessInput(e.detail)}
		on:guessPick={(e) => onGuessPick(e.detail)}
		on:guessClose={onGuessClose}
	/>
</div>
