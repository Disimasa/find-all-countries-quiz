import { get, writable } from 'svelte/store'
import { goto } from '$app/navigation'
import { MapEraRegistry } from '@domain/maps'
import type { GameConfig, GameSnapshot, Locale } from '@domain/entities'
import { GeoJsonLoader } from '@infrastructure/data/geo_json_loader'
import { MapRenderer, MAP_TRANSITION_IN_MS, MAP_TRANSITION_UI_REVEAL_AT } from '@infrastructure/map'
import { getLocale, messages } from '@i18n'
import { applyMapEraTheme, getActiveEraThemeProfile, type EraThemeProfile } from '@theme'
import {
	destroyGame,
	gameSnapshot,
	mapResetTick,
	resumeGame,
	selectCountry,
	startGame
} from './game/session_bridge'
import {
	buildGameConfig,
	loadSavedGame,
	type SavedGameProgress
} from '@persist'
import { getSharedMapEra, setSharedMapEra } from './map_era.ts'
import { buildPlayHref, getGameSettings } from './controller'
import {
	pauseLobbyTeaser,
	resumeLobbyTeaser,
	showLobbyCountryPick,
	startLobbyTeaser,
	stopLobbyTeaser,
	getLobbyTeaserEpoch
} from './_sub/lobby_teaser'

export const mapShellReady = writable(false)
export const mapShellTransitioning = writable(false)
export const mapEraSwitching = writable(false)
export const activeEraTheme = writable<EraThemeProfile>(
	getActiveEraThemeProfile(getGameSettings().eraId)
)

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function finishZoomWithUiReveal(zoomIn: Promise<void>): Promise<void> {
	const reduced =
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches

	if (reduced) {
		await zoomIn
		mapShellTransitioning.set(false)
		return
	}

	const revealAfterMs = Math.round(MAP_TRANSITION_IN_MS * MAP_TRANSITION_UI_REVEAL_AT)
	await Promise.all([
		zoomIn,
		delay(revealAfterMs).then(() => mapShellTransitioning.set(false))
	])
}

let renderer: MapRenderer | null = null
let mapShellRootEl: HTMLElement | null = null
let selectHandler: ((id: string) => void) | null = null
let lobbyModeActive = false
let exploreModeActive = false
let lobbyModeActivationGen = 0
let unsubReset: (() => void) | null = null
let initPromise: Promise<void> | null = null
let mountWaiters: Array<() => void> = []

function notifyMountStarted(): void {
	for (const resolve of mountWaiters) resolve()
	mountWaiters = []
}

function waitForMountStart(): Promise<void> {
	if (renderer || initPromise) return Promise.resolve()
	return new Promise((resolve) => mountWaiters.push(resolve))
}

function getRenderer(): MapRenderer {
	if (!renderer) throw new Error('Map shell is not mounted')
	return renderer
}

async function ensureReady(): Promise<MapRenderer> {
	await waitForMountStart()
	if (initPromise) await initPromise
	return getRenderer()
}

function applyEraPresentation(eraId: string): void {
	if (!mapShellRootEl) return
	const profile = applyMapEraTheme(eraId, mapShellRootEl)
	activeEraTheme.set(profile)
}

function cancelPendingLobbyActivation(): void {
	lobbyModeActivationGen++
}

async function loadEra(eraId: string): Promise<void> {
	const era = MapEraRegistry.create(eraId)
	await era.initialize(new GeoJsonLoader())
	setSharedMapEra(era)
	applyEraPresentation(eraId)
	if (renderer?.isReady()) {
		await renderer.swapEra(era)
	}
}

export async function switchMapEra(nextEraId: string): Promise<void> {
	if (!MapEraRegistry.isKnown(nextEraId)) return
	const current = getSharedMapEra()?.id ?? getGameSettings().eraId
	if (current === nextEraId) return

	mapEraSwitching.set(true)
	stopLobbyTeaser(renderer ?? undefined)
	try {
		await loadEra(nextEraId)

		if (selectHandler) {
			lobbyModeActive = false
			exploreModeActive = false
			await renderer?.activatePlay(selectHandler, get(gameSnapshot))
		} else if (exploreModeActive) {
			await activateExploreMode(getLocale())
		} else if (lobbyModeActive || get(mapShellReady)) {
			await activateLobbyMode()
		}
	} finally {
		mapEraSwitching.set(false)
	}
}

export function initMapShell(el: HTMLElement): Promise<void> {
	notifyMountStarted()
	mapShellRootEl = el

	if (renderer?.isReady()) {
		mapShellReady.set(true)
		renderer.resize()
		applyEraPresentation(getGameSettings().eraId)
		return Promise.resolve()
	}

	if (initPromise) return initPromise

	initPromise = (async () => {
		const settings = getGameSettings()
		await loadEra(settings.eraId)
		void import('@infrastructure/data/geo_json_loader')
		renderer = new MapRenderer()
		const era = getSharedMapEra()!
		await new Promise<void>((resolve) => {
			renderer!.mountShell(el, era, () => resolve())
		})
		mapShellReady.set(true)
		unsubReset = mapResetTick.subscribe(() => {
			if (selectHandler) renderer?.resetView()
		})
	})()

	return initPromise
}

export function setMapSelectHandler(handler: ((id: string) => void) | null): void {
	selectHandler = handler
	if (!renderer?.isReady()) return

	if (handler) {
		lobbyModeActive = false
		exploreModeActive = false
		stopLobbyTeaser(renderer)
		const snapshot = get(gameSnapshot)
		void renderer.activatePlay(handler, snapshot)
	} else {
		void activateLobbyMode()
	}
}

function onLobbyCountrySelected(countryId: string): void {
	if (!renderer) return

	const startLabel = messages[getLocale()].start
	showLobbyCountryPick(renderer!, countryId, startLabel, () => {
		stopLobbyTeaser(renderer ?? undefined)
		void transitionToPlay(buildPlayHref(), { focusCountryId: countryId })
	})
}

export async function activateLobbyMode(): Promise<void> {
	const generation = lobbyModeActivationGen
	if (lobbyModeActive) return
	exploreModeActive = false
	const map = await ensureReady()
	if (generation !== lobbyModeActivationGen) return
	if (lobbyModeActive) return
	lobbyModeActive = true
	map.activateLobby(
		onLobbyCountrySelected,
		() => {
			if (renderer) pauseLobbyTeaser(renderer)
		},
		() => {
			if (renderer) resumeLobbyTeaser(renderer)
		}
	)
}

export async function activateExploreMode(locale: Locale): Promise<void> {
	const map = await ensureReady()
	if (exploreModeActive) {
		map.updateExploreLabels(locale)
		return
	}
	stopLobbyTeaser(map)
	lobbyModeActive = false
	exploreModeActive = true
	map.activateExplore(locale)
}

export function updateMapStyles(snapshot: GameSnapshot): void {
	renderer?.updateStyles(snapshot)
}

export function focusMapOnCountry(countryId: string): void {
	void renderer?.flyToCountry(countryId)
}

export function flashWrongOnMap(id: string): void {
	renderer?.flashWrong(id)
}

export async function transitionToPlay(
	href: string,
	options?: { resume?: boolean; focusCountryId?: string }
): Promise<void> {
	if (get(mapShellTransitioning)) return

	const map = await ensureReady()
	cancelPendingLobbyActivation()
	mapShellTransitioning.set(true)
	stopLobbyTeaser(map)
	lobbyModeActive = false
	exploreModeActive = false

	try {
		await map.flyToWideView()
		await goto(href)
		const settings = getGameSettings()
		const config = options?.resume
			? loadSavedGame(settings.eraId)?.config ?? buildGameConfig(settings)
			: buildGameConfig(settings)
		const saved = options?.resume ? loadSavedGame(settings.eraId) : null
		if (saved?.progress) {
			await resumeGame(config, saved.progress)
		} else {
			await startGame(config)
		}
		if (selectHandler) await map.activatePlay(selectHandler, get(gameSnapshot))
		if (options?.focusCountryId) {
			selectCountry(options.focusCountryId)
			await finishZoomWithUiReveal(map.flyToCountry(options.focusCountryId))
		} else {
			await finishZoomWithUiReveal(map.flyToPlayView())
		}
	} finally {
		mapShellTransitioning.set(false)
	}
}

export async function transitionToPlayResume(href: string): Promise<void> {
	await transitionToPlay(href, { resume: true })
}

export async function transitionToExplore(): Promise<void> {
	if (get(mapShellTransitioning)) return

	const map = await ensureReady()
	mapShellTransitioning.set(true)
	stopLobbyTeaser(map)

	try {
		setMapSelectHandler(null)
		destroyGame()
		await map.flyToWideView()
		await goto('/explore')
		lobbyModeActive = false
		exploreModeActive = false
		await activateExploreMode(getLocale())
		await finishZoomWithUiReveal(map.flyToPreviewView())
	} finally {
		mapShellTransitioning.set(false)
	}
}

export async function transitionToHome(): Promise<void> {
	if (get(mapShellTransitioning)) return

	const map = await ensureReady()
	mapShellTransitioning.set(true)
	stopLobbyTeaser(map)

	try {
		setMapSelectHandler(null)
		destroyGame()
		await map.flyToWideView()
		await goto('/')
		lobbyModeActive = false
		await activateLobbyMode()
		await finishZoomWithUiReveal(map.flyToPreviewView())
	} finally {
		mapShellTransitioning.set(false)
	}
}

export async function enterPlayDirect(
	config: GameConfig,
	options?: { resume?: SavedGameProgress }
): Promise<void> {
	const map = await ensureReady()
	cancelPendingLobbyActivation()
	stopLobbyTeaser(map)
	if (options?.resume) {
		await resumeGame(config, options.resume)
	} else {
		await startGame(config)
	}
	if (selectHandler) await map.activatePlay(selectHandler, get(gameSnapshot))
	await map.flyToPlayView(0)
}

export async function runLobbyTeaserWhenReady(): Promise<void> {
	const epoch = getLobbyTeaserEpoch()
	const map = await ensureReady()
	if (epoch !== getLobbyTeaserEpoch()) return
	startLobbyTeaser(map)
}

export function stopLobbyMapOverlays(): void {
	stopLobbyTeaser(renderer ?? undefined)
}

export { stopLobbyTeaser } from './_sub/lobby_teaser'
