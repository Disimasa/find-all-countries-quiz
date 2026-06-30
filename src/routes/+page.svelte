<script lang="ts">
	import { goto } from '$app/navigation'
	import StartScreen from './ui/StartScreen.svelte'
	import { buildPlayHref, livesEnabled, timerEnabled, toggleLocale } from './controller'
	import { locale, t } from '@i18n'

	let timerOn = true
	let livesOn = true

	$: timerOn = $timerEnabled
	$: livesOn = $livesEnabled

	function handleStart() {
		goto(buildPlayHref())
	}
</script>

<StartScreen
	title={$t('title')}
	subtitle={$t('subtitle')}
	timerLabel={$t('timer')}
	livesLabel={$t('lives')}
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
