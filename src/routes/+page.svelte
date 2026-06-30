<script lang="ts">
	import { buildPlayHref, livesEnabled, timerEnabled, toggleLocale, transitionToPlay } from './controller'
	import { locale, t } from '@i18n'
	import StartScreen from './ui/StartScreen.svelte'

	let timerOn = true
	let livesOn = true

	$: timerOn = $timerEnabled
	$: livesOn = $livesEnabled

	function handleStart() {
		void transitionToPlay(buildPlayHref())
	}
</script>

<StartScreen
	title={$t('title')}
	modeHint={$t('modeHint')}
	timerLabel={$t('timer')}
	livesLabel={$t('lives')}
	languageLabel={$t('language')}
	startLabel={$t('start')}
	disclaimer={$t('disclaimer')}
	{timerOn}
	{livesOn}
	currentLocale={$locale}
	on:start={handleStart}
	on:toggleTimer={() => timerEnabled.update((v) => !v)}
	on:toggleLives={() => livesEnabled.update((v) => !v)}
	on:changeLocale={toggleLocale}
/>
