<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { get } from 'svelte/store'
	import { page } from '$app/stores'
	import ProgressPanel from './ui/ProgressPanel.svelte'
	import {
		autocompleteResults,
		clearSelection,
		destroyGame,
		gameSnapshot,
		getSession,
		parseConfig,
		resetMapView,
		selectCountry,
		selectRandomCountry,
		showEndGameSummary,
		submitGuess,
		updateAutocomplete
	} from './controller'
	import { isRandomCountryHotkey } from './hotkeys'
	import { locale, t } from '@i18n'
	import { loadSavedGame } from '@persist'
	import { getSharedMapEra } from '../map_era.ts'
	import { parseEraId } from './parse_config.ts'
	import { eraId as eraIdStore } from '../controller'
	import {
		enterPlayDirect,
		focusMapOnCountry,
		flashWrongOnMap,
		mapShellReady,
		mapShellTransitioning,
		setMapSelectHandler,
		switchMapEra,
		transitionToHome,
		updateMapStyles
	} from '../map_shell'

	let guessQuery = ''
	let wrongPulse = 0

	onMount(() => {
		setMapSelectHandler(onSelect)

		const startSession = async () => {
			if (get(mapShellTransitioning) || getSession()) return

			const settingsEraId = parseEraId($page.url.search)
			if (settingsEraId !== get(eraIdStore)) {
				eraIdStore.set(settingsEraId)
			}

			const mapEraId = getSharedMapEra()?.id
			if (mapEraId && mapEraId !== settingsEraId) {
				await switchMapEra(settingsEraId)
			}

			if (getSession()) return

			const saved = loadSavedGame(settingsEraId)
			if (saved) {
				await enterPlayDirect(saved.config, { resume: saved.progress })
			} else {
				const config = parseConfig($page.url.search)
				await enterPlayDirect(config)
			}
		}

		if (get(mapShellReady)) {
			void startSession()
		} else {
			const unsub = mapShellReady.subscribe((ready) => {
				if (!ready) return
				unsub()
				void startSession()
			})
		}

		const onKeydown = (event: KeyboardEvent) => {
			if (!isRandomCountryHotkey(event)) return
			if (get(gameSnapshot).status !== 'playing') return
			event.preventDefault()
			onRandomCountry()
		}

		window.addEventListener('keydown', onKeydown, { capture: true })
		return () => window.removeEventListener('keydown', onKeydown, { capture: true })
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

	function onRandomCountry() {
		const id = selectRandomCountry()
		if (!id) return
		guessQuery = ''
		updateAutocomplete('')
		focusMapOnCountry(id)
	}

	function onEnd() {
		void transitionToHome()
	}

	function onEndQuiz() {
		showEndGameSummary()
	}

	$: canPickRandomCountry =
		$gameSnapshot.status === 'playing' &&
		$gameSnapshot.progress.correct < $gameSnapshot.progress.total
	$: mapEraId = $eraIdStore
	$: session = ($gameSnapshot.status, getSession())
	$: mapLoading =
		($gameSnapshot.status === 'loading' || !$mapShellReady) && !$mapShellTransitioning
	$: panelRevealed =
		!$mapShellTransitioning && !mapLoading && $gameSnapshot.status !== 'error'
	$: loadFailed = $gameSnapshot.status === 'error'
</script>

<div
	class="pointer-events-none relative h-full overflow-hidden"
	data-testid="play-state"
	data-status={$gameSnapshot.status}
	data-selected-id={$gameSnapshot.selectedId ?? ''}
	data-correct={$gameSnapshot.progress.correct}
	data-total={$gameSnapshot.progress.total}
	data-era-id={mapEraId}
	data-lives={$gameSnapshot.stats.lives}
	data-max-lives={$gameSnapshot.stats.maxLives}
	data-lives-enabled={$gameSnapshot.stats.livesEnabled}
>
	{#if mapLoading}
		<div
			class="pointer-events-none absolute inset-0 z-5 flex items-center justify-center bg-base-100/40 text-base-content backdrop-blur-[1px]"
		>
			{$t('loading')}
		</div>
	{/if}

	{#if loadFailed}
		<div
			class="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center p-4"
		>
			<section
				class="w-full max-w-sm rounded-2xl border border-base-300/80 bg-base-100 p-6 text-center shadow-lg"
			>
				<h2 class="text-lg font-bold text-base-content">{$t('loadMapError')}</h2>
				<button type="button" class="btn btn-primary mt-5 w-full rounded-xl" on:click={onEnd}>
					{$t('home')}
				</button>
			</section>
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
			mapEraId={mapEraId}
			{canPickRandomCountry}
			{guessQuery}
			autocompleteResults={$autocompleteResults}
			{wrongPulse}
			on:reset={resetMapView}
			on:end={onEndQuiz}
			on:guessInput={(e) => onGuessInput(e.detail)}
			on:guessPick={(e) => onGuessPick(e.detail)}
			on:guessClose={onGuessClose}
			on:randomCountry={onRandomCountry}
		/>
	</div>
</div>
