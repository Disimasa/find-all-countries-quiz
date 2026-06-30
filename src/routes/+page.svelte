<script lang="ts">
	import { onMount } from 'svelte'
	import { Circle } from 'svelte-loading-spinners'
	import {
		buildPlayHref,
		getSavedGame,
		livesEnabled,
		timerEnabled,
		toggleLocale
	} from './controller'
	import { warmupPlay } from './play/controller'
	import { mapShellReady, transitionToPlay, transitionToPlayResume } from './map_shell'
	import { locale, t } from '@i18n'
	import StartScreen from './ui/StartScreen.svelte'

	let timerOn = true
	let livesOn = true
	let continueLabel = ''

	$: timerOn = $timerEnabled
	$: livesOn = $livesEnabled

	onMount(() => {
		const saved = getSavedGame()
		if (saved) {
			timerEnabled.set(saved.config.timerEnabled)
			livesEnabled.set(saved.config.livesEnabled)
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

	$: $locale, updateContinueLabel()

	function handleStart() {
		void transitionToPlay(buildPlayHref())
	}

	function handleContinue() {
		void transitionToPlayResume('/play')
	}
</script>

{#if $mapShellReady}
	<StartScreen
		title={$t('title')}
		modeHint={$t('modeHint')}
		timerLabel={$t('timer')}
		livesLabel={$t('lives')}
		languageLabel={$t('language')}
		startLabel={$t('start')}
		{continueLabel}
		disclaimer={$t('disclaimer')}
		{timerOn}
		{livesOn}
		currentLocale={$locale}
		on:start={handleStart}
		on:continue={handleContinue}
		on:toggleTimer={() => timerEnabled.update((v) => !v)}
		on:toggleLives={() => livesEnabled.update((v) => !v)}
		on:changeLocale={toggleLocale}
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
