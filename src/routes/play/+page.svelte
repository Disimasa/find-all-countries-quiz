<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import GameMap from './ui/GameMap.svelte'
	import GuessDialog from './ui/GuessDialog.svelte'
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

	function onGuessPick(id: string) {
		submitGuess(id)
		guessQuery = ''
		updateAutocomplete('')
	}

	function onGuessClose() {
		clearSelection()
	}

	$: formattedTime = formatTime($gameSnapshot.timeRemaining)
	$: session = ($gameSnapshot.status, getSession())
</script>

<div class="flex h-screen flex-col md:flex-row">
	<section class="relative min-h-[50vh] flex-1 md:min-h-0">
		<GameMap
			snapshot={$gameSnapshot}
			loadingLabel={$t('loading')}
			on:select={(e) => onSelect(e.detail)}
		/>

		{#if $gameSnapshot.selectedId}
			<div class="absolute bottom-4 left-4 right-4 z-[1000] max-w-md">
				<GuessDialog
					title={$t('guessTitle')}
					placeholder={$t('guessPlaceholder')}
					locale={$gameSnapshot.locale}
					results={$autocompleteResults}
					query={guessQuery}
					on:input={(e) => onGuessInput(e.detail)}
					on:pick={(e) => onGuessPick(e.detail)}
					on:close={onGuessClose}
				/>
			</div>
		{/if}
	</section>

	<ProgressPanel
		snapshot={$gameSnapshot}
		correctLabel={$t('correct')}
		remainingLabel={$t('remaining')}
		livesLabel={$t('livesLabel')}
		timeLabel={$t('time')}
		{formattedTime}
		resetLabel={$t('resetView')}
		endLabel={$t('endQuiz')}
		on:reset={resetMapView}
		on:end={() => goto('/')}
	/>
</div>
