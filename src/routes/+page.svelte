<script lang="ts">
	import { onMount, tick } from 'svelte'
	import { get } from 'svelte/store'
	import { afterNavigate } from '$app/navigation'
	import { page } from '$app/stores'
	import { Circle } from 'svelte-loading-spinners'
	import {
		applyGameSettings,
		buildPlayHref,
		eraId,
		getGameSettings,
		getSavedGame,
		livesEnabled,
		maxLives,
		timerEnabled,
		timerMinutes
	} from './controller'
	import {
		buildLobbyShareHref,
		hasLobbySettingsInUrl,
		isLobbySearchInSync,
		resolveSettingsFromSearch
	} from './game_settings_url.ts'
	import { copyShareLink } from './play/share_game_link'
	import { warmupPlay } from './play/controller'
	import { getSharedMapEra } from './map_era.ts'
	import { isLobbyEraSelectionRedundant } from './lobby_era_selection.ts'
	import { safeReplaceState } from './safe_replace_state.ts'
	import { mapShellReady, switchMapEra, transitionToPlay, transitionToPlayResume } from './map_shell'
	import { locale, setLocale, t } from '@i18n'
	import StartScreen from './ui/StartScreen.svelte'

	let timerOn = true
	let livesOn = true
	let minutes = 30
	let lives = 3
	let currentEra = 'modern'
	let continueLabel = ''
	let shareCopied = false
	let canSyncLobbyUrl = false

	$: timerOn = $timerEnabled
	$: livesOn = $livesEnabled
	$: minutes = $timerMinutes
	$: lives = $maxLives
	$: currentEra = $eraId

	$: eraLabels = {
		eraModern: $t('eraModern'),
		eraPreWW1: $t('eraPreWW1'),
		eraCe100: $t('eraCe100'),
		eraCe1300: $t('eraCe1300')
	}
	$: eraHints = {
		preww1: $t('eraPreWW1Hint'),
		ce100: $t('eraCe100Hint'),
		ce1300: $t('eraCe1300Hint')
	}

	async function applyLobbyFromUrl(search: string): Promise<void> {
		const settings = resolveSettingsFromSearch(search)
		applyGameSettings(settings)
		const mapEra = getSharedMapEra()?.id
		if (settings.eraId !== mapEra) {
			await switchMapEra(settings.eraId)
		}
	}

	async function pushLobbyUrl(): Promise<void> {
		if (get(page).url.pathname !== '/') return

		const settings = getGameSettings()
		const search = get(page).url.search
		if (isLobbySearchInSync(search, settings)) return

		await safeReplaceState(buildLobbyShareHref(settings), {})
	}

	/** Safe to call once the lobby page is mounted; waits for SvelteKit router. */
	async function reconcileLobbyUrl(search: string): Promise<void> {
		if (isLobbySearchInSync(search, getGameSettings())) return

		if (hasLobbySettingsInUrl(search)) {
			await applyLobbyFromUrl(search)
		}

		const settings = getGameSettings()
		if (!isLobbySearchInSync(search, settings)) {
			await safeReplaceState(buildLobbyShareHref(settings), {})
		}
	}

	onMount(() => {
		canSyncLobbyUrl = true
		void (async () => {
			await tick()
			if (get(page).url.pathname === '/') {
				await reconcileLobbyUrl(get(page).url.search)
			}
		})()

		const mapEra = getSharedMapEra()?.id
		if (get(eraId) !== mapEra) {
			void switchMapEra(get(eraId))
		}

		updateContinueLabel()
		warmupPlay()
		const unsubReady = mapShellReady.subscribe((ready) => {
			if (ready) warmupPlay()
		})
		return unsubReady
	})

	afterNavigate(({ to }) => {
		if (!canSyncLobbyUrl || !to || to.url.pathname !== '/') return
		void reconcileLobbyUrl(to.url.search)
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
		if (isLobbyEraSelectionRedundant(nextEraId, $eraId, getSharedMapEra()?.id)) return
		eraId.set(nextEraId)
		await switchMapEra(nextEraId)
		await pushLobbyUrl()
		updateContinueLabel()
	}

	function handleTimerSelect(event: CustomEvent<{ enabled: boolean; minutes?: number }>) {
		timerEnabled.set(event.detail.enabled)
		if (event.detail.minutes != null) timerMinutes.set(event.detail.minutes)
		void pushLobbyUrl()
	}

	function handleLivesSelect(event: CustomEvent<{ enabled: boolean; count?: number }>) {
		livesEnabled.set(event.detail.enabled)
		if (event.detail.count != null) maxLives.set(event.detail.count)
		void pushLobbyUrl()
	}

	async function handleShare() {
		const copied = await copyShareLink(window.location.href)
		if (!copied) {
			window.prompt(window.location.href)
			return
		}

		shareCopied = true
		window.setTimeout(() => {
			shareCopied = false
		}, 2000)
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
		shareLabel={$t('shareGame')}
		shareCopiedLabel={$t('shareGameCopied')}
		shareHint={$t('shareGameHint')}
		{shareCopied}
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
		on:share={handleShare}
		on:eraSelect={(event) => void handleEraSelect(event.detail)}
		on:timerSelect={handleTimerSelect}
		on:livesSelect={handleLivesSelect}
		on:localeSelect={(event) => setLocale(event.detail)}
	/>
{:else}
	<div
		data-testid="lobby-loading"
		class="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center gap-3"
		aria-busy="true"
		aria-live="polite"
	>
		<Circle size="60" color="var(--color-primary)" unit="px" duration="1s" />
		<p class="text-xl font-medium text-base-content/75">{$t('loading')}</p>
	</div>
{/if}
