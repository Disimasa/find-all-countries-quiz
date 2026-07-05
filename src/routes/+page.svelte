<script lang="ts">
	import { onMount } from 'svelte'
	import { get } from 'svelte/store'
	import { replaceState } from '$app/navigation'
	import { page } from '$app/stores'
	import { Circle } from 'svelte-loading-spinners'
	import {
		applyGameSettings,
		buildPlayHref,
		eraId,
		getSavedGame,
		livesEnabled,
		maxLives,
		timerEnabled,
		timerMinutes
	} from './controller'
	import {
		initialLobbySyncedSearch,
		parseLobbySearchSync,
		resolveLobbyUrlPush,
		shouldApplyLobbySearchFromUrl,
		shouldSwitchMapEraFromUrl
	} from './lobby_url_sync.ts'
	import { copyShareLink } from './play/share_game_link'
	import { warmupPlay } from './play/controller'
	import { getSharedMapEra } from './map_era.ts'
	import { isLobbyEraSelectionRedundant } from './lobby_era_selection.ts'
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
	let lobbyUrlReady = false
	let syncedLobbySearch: string | null = null

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

	function syncLobbyUrl(): void {
		if (!lobbyUrlReady || get(page).url.pathname !== '/') return

		const settings = {
			eraId: get(eraId),
			timerEnabled: get(timerEnabled),
			livesEnabled: get(livesEnabled),
			timerMinutes: get(timerMinutes),
			maxLives: get(maxLives)
		}

		const push = resolveLobbyUrlPush(get(page).url.search, settings)
		syncedLobbySearch = push.syncedSearch
		if (!push.shouldReplace) return

		replaceState(push.href, {})
	}

	$: if (lobbyUrlReady && $mapShellReady) {
		$eraId
		$timerEnabled
		$livesEnabled
		$timerMinutes
		$maxLives
		void syncLobbyUrl()
	}

	$: if (lobbyUrlReady && $page.url.pathname === '/') {
		const search = $page.url.search
		if (shouldApplyLobbySearchFromUrl(search, syncedLobbySearch)) {
			const { settings, syncedSearch } = parseLobbySearchSync(search)
			if (settings) {
				applyGameSettings(settings)
				const nextEra = shouldSwitchMapEraFromUrl(settings, $eraId)
				if (nextEra) void switchMapEra(nextEra)
			}
			syncedLobbySearch = syncedSearch
		}
	}

	onMount(() => {
		const initialSearch = get(page).url.search
		const { settings } = parseLobbySearchSync(initialSearch)
		if (settings) {
			applyGameSettings(settings)
			const nextEra = shouldSwitchMapEraFromUrl(settings, get(eraId))
			if (nextEra) void switchMapEra(nextEra)
		} else {
			const saved = getSavedGame()
			if (saved) {
				eraId.set(saved.eraId)
				timerEnabled.set(saved.config.timerEnabled)
				livesEnabled.set(saved.config.livesEnabled)
				timerMinutes.set(Math.round(saved.config.timerSeconds / 60))
				maxLives.set(saved.config.maxLives)
			}
		}
		syncedLobbySearch = initialLobbySyncedSearch(initialSearch)

		lobbyUrlReady = true
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
		if (isLobbyEraSelectionRedundant(nextEraId, $eraId, getSharedMapEra()?.id)) return
		eraId.set(nextEraId)
		await switchMapEra(nextEraId)
		updateContinueLabel()
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
