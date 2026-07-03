<script lang="ts">
	import { onMount } from 'svelte'
	import { Circle } from 'svelte-loading-spinners'
	import {
		buildPlayHref,
		eraId,
		getSavedGame,
		livesEnabled,
		maxLives,
		timerEnabled,
		timerMinutes
	} from './controller'
	import { warmupPlay } from './play/controller'
	import { mapShellReady, switchMapEra, transitionToPlay, transitionToPlayResume } from './map_shell'
	import { locale, setLocale, t } from '@i18n'
	import StartScreen from './ui/StartScreen.svelte'

	let timerOn = true
	let livesOn = true
	let minutes = 30
	let lives = 3
	let currentEra = 'modern'
	let continueLabel = ''

	$: timerOn = $timerEnabled
	$: livesOn = $livesEnabled
	$: minutes = $timerMinutes
	$: lives = $maxLives
	$: currentEra = $eraId

	$: eraLabels = {
		eraModern: $t('eraModern'),
		eraPreWW1: $t('eraPreWW1'),
		eraCe100: $t('eraCe100')
	}
	$: eraHints = {
		preww1: $t('eraPreWW1Hint'),
		ce100: $t('eraCe100Hint')
	}

	onMount(() => {
		const saved = getSavedGame()
		if (saved) {
			eraId.set(saved.eraId)
			timerEnabled.set(saved.config.timerEnabled)
			livesEnabled.set(saved.config.livesEnabled)
			timerMinutes.set(Math.round(saved.config.timerSeconds / 60))
			maxLives.set(saved.config.maxLives)
		}
		updateContinueLabel()
		warmupPlay()
		const unsubReady = mapShellReady.subscribe((ready) => {
			if (ready) warmupPlay()
		})
		return unsubReady
	})

	function updateContinueLabel() {
		const saved = getSavedGame()
		if (!saved) {
			continueLabel = ''
			return
		}
		continueLabel = $t('continueGame')
			.replace('{n}', String(saved.progress.guessedIds.length))
			.replace('{total}', String(saved.progress.total))
	}

	$: $locale, $eraId, updateContinueLabel()

	function handleStart() {
		void transitionToPlay(buildPlayHref())
	}

	function handleContinue() {
		void transitionToPlayResume(buildPlayHref())
	}

	async function handleEraSelect(nextEraId: string) {
		if (nextEraId === $eraId) return
		eraId.set(nextEraId)
		await switchMapEra(nextEraId)
		updateContinueLabel()
	}
</script>

{#if $mapShellReady}
	<StartScreen
		title={$t('title')}
		modeHint={$t('modeHint')}
		eraLabel={$t('era')}
		{eraLabels}
		{eraHints}
		timerLabel={$t('timer')}
		livesLabel={$t('lives')}
		infiniteLabel={$t('infinite')}
		languageLabel={$t('language')}
		startLabel={$t('start')}
		{continueLabel}
		disclaimer={$t('disclaimer')}
		currentEraId={currentEra}
		{timerOn}
		{livesOn}
		timerMinutes={minutes}
		maxLives={lives}
		currentLocale={$locale}
		on:start={handleStart}
		on:continue={handleContinue}
		on:eraSelect={(event) => void handleEraSelect(event.detail)}
		on:timerSelect={(event) => {
			timerEnabled.set(event.detail.enabled)
			if (event.detail.minutes != null) timerMinutes.set(event.detail.minutes)
		}}
		on:livesSelect={(event) => {
			livesEnabled.set(event.detail.enabled)
			if (event.detail.count != null) maxLives.set(event.detail.count)
		}}
		on:localeSelect={(event) => setLocale(event.detail)}
	/>
{:else}
	<div
		class="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center gap-3"
		aria-busy="true"
		aria-live="polite"
	>
		<Circle size="60" color="var(--color-primary)" unit="px" duration="1s" />
		<p class="text-xl font-medium text-base-content/75">{$t('loading')}</p>
	</div>
{/if}
