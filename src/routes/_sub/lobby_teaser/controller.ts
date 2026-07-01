import { mount, unmount } from 'svelte'
import maplibregl, { type Map, type Marker } from 'maplibre-gl'
import { filterTeaserCountryIds, featureCentroid } from '@infrastructure/map/country_centroid'
import { getSharedMapEra } from '../../map_era.ts'
import {
	LOBBY_PIN_MODES,
	LOBBY_TEASER_EXCLUDED_COUNTRY_IDS,
	LOBBY_TEASER_INTERVAL_MS,
	LOBBY_TEASER_MAX_CENTROID_LAT,
	LOBBY_TEASER_MIN_BBOX_SPAN
} from './constants.ts'
import type {
	LobbyMapHost,
	LobbyMarkerPlacementAction,
	LobbyPinMode
} from './types.ts'
import LobbyMapPin from './ui/LobbyMapPin.svelte'

export function pickRandomExcludingRecent<T>(
	items: readonly T[],
	recent: readonly T[],
	recentLimit: number
): { pick: T; nextRecent: T[] } | null {
	if (items.length === 0) return null
	if (items.length === 1) return { pick: items[0], nextRecent: [items[0]] }

	const pool = items.filter((item) => !recent.includes(item))
	const candidates = pool.length > 0 ? pool : [...items]
	const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? items[0]

	return {
		pick,
		nextRecent: [pick, ...recent].slice(0, recentLimit)
	}
}

export function pickNextTeaserCountryId(
	countryIds: readonly string[],
	recentIds: readonly string[]
) {
	return pickRandomExcludingRecent(countryIds, recentIds, 2)
}

export function pickNextTeaserMode(recentModes: readonly LobbyPinMode[]) {
	return pickRandomExcludingRecent(LOBBY_PIN_MODES, recentModes, LOBBY_PIN_MODES.length - 1)
}

export function planLobbyMarkerPlacement(isFirstMount: boolean): LobbyMarkerPlacementAction[] {
	if (isFirstMount) {
		return [
			{ phase: 'before-replay', type: 'set-lng-lat' },
			{ phase: 'before-replay', type: 'add-to-map' },
			{ phase: 'after-exit', type: 'reveal' }
		]
	}

	return [
		{ phase: 'after-exit', type: 'set-lng-lat' },
		{ phase: 'after-exit', type: 'reveal' }
	]
}

type LobbyMarker = {
	root: HTMLDivElement
	setMode: (mode: LobbyPinMode) => void
	replayPop: (
		mode: LobbyPinMode,
		afterExit?: () => void | Promise<void>
	) => Promise<void>
	destroy: () => void
}

function createLobbyMarker(): LobbyMarker {
	const root = document.createElement('div')
	let replayPop = async (_mode: LobbyPinMode, _afterExit?: () => void | Promise<void>) => {}
	let setMode = (_mode: LobbyPinMode) => {}

	const instance = mount(LobbyMapPin, {
		target: root,
		props: {
			registerReplay(
				fn: (mode: LobbyPinMode, afterExit?: () => void | Promise<void>) => Promise<void>
			) {
				replayPop = fn
			},
			registerSetMode(fn: (mode: LobbyPinMode) => void) {
				setMode = fn
			}
		}
	})

	return {
		root,
		setMode: (mode) => setMode(mode),
		replayPop: (mode, afterExit) => replayPop(mode, afterExit),
		destroy: () => unmount(instance)
	}
}

let hintCountryId: string | null = null
let hintPinMode: LobbyPinMode = 'question'
let hintLobbyMarker: LobbyMarker | null = null
let hintMapMarker: Marker | null = null

export function showLobbyMapHint(
	host: LobbyMapHost,
	nextCountryId: string,
	mode: LobbyPinMode = 'question'
): void {
	if (!host.isReady()) return

	const era = host.getEra()
	const map = host.getMap()
	if (!era || !map) return

	if (hintCountryId && hintCountryId !== nextCountryId) {
		host.setCountryVisual(hintCountryId, 'default')
	}

	hintCountryId = nextCountryId
	hintPinMode = mode
	void placeHintMarker(host, map, nextCountryId, () => {
		host.setCountryVisual(nextCountryId, 'selected')
	})
}

export function clearLobbyMapHint(host: LobbyMapHost): void {
	if (hintCountryId) {
		host.setCountryVisual(hintCountryId, 'default')
		hintCountryId = null
	}

	hintMapMarker?.remove()
	hintMapMarker = null
	hintLobbyMarker?.destroy()
	hintLobbyMarker = null
}

async function placeHintMarker(
	host: LobbyMapHost,
	map: Map,
	targetCountryId: string,
	onReveal?: () => void
): Promise<void> {
	const era = host.getEra()
	if (!era) return

	const feature = era.getGeoJson().features.find(
		(item) => era.getEntityIdFromFeature(item) === targetCountryId
	)
	const center = feature ? featureCentroid(feature) : null
	if (!center) return

	if (!hintLobbyMarker) {
		hintLobbyMarker = createLobbyMarker()
		hintMapMarker = new maplibregl.Marker({
			element: hintLobbyMarker.root,
			anchor: 'bottom',
			offset: [0, 1]
		})
	}

	const marker = hintMapMarker!
	const isFirstMount = !marker.getElement().parentElement
	const plan = planLobbyMarkerPlacement(isFirstMount)

	if (isFirstMount) {
		hintLobbyMarker.setMode(hintPinMode)
	}

	for (const action of plan) {
		if (action.phase !== 'before-replay') continue
		if (action.type === 'set-lng-lat') marker.setLngLat(center)
		if (action.type === 'add-to-map') marker.addTo(map)
	}

	await hintLobbyMarker.replayPop(hintPinMode, async () => {
		for (const action of plan) {
			if (action.phase !== 'after-exit') continue
			if (action.type === 'set-lng-lat') marker.setLngLat(center)
			if (action.type === 'reveal') onReveal?.()
		}
	})
}

let timerId: ReturnType<typeof setInterval> | null = null
let countryIds: string[] = []
let recentIds: string[] = []
let recentModes: LobbyPinMode[] = []
let running = false
let mapRef: LobbyMapHost | null = null

function pickNextId(): string | null {
	const result = pickNextTeaserCountryId(countryIds, recentIds)
	if (!result) return null
	recentIds = result.nextRecent
	return result.pick
}

function pickNextMode(): LobbyPinMode {
	const result = pickNextTeaserMode(recentModes)
	if (!result) return LOBBY_PIN_MODES[0]
	recentModes = result.nextRecent
	return result.pick
}

function showNext(): void {
	const id = pickNextId()
	if (!id || !mapRef) return
	showLobbyMapHint(mapRef, id, pickNextMode())
}

export function startLobbyTeaser(map: LobbyMapHost): void {
	if (running) return

	const era = getSharedMapEra()
	if (!era) return

	countryIds = filterTeaserCountryIds(
		era.getGeoJson(),
		(feature) => era.getEntityIdFromFeature(feature),
		LOBBY_TEASER_MIN_BBOX_SPAN,
		{
			maxCentroidLat: LOBBY_TEASER_MAX_CENTROID_LAT,
			excludedIds: LOBBY_TEASER_EXCLUDED_COUNTRY_IDS
		}
	)
	if (countryIds.length === 0) return

	mapRef = map
	running = true
	recentIds = []
	recentModes = []
	showNext()
	timerId = setInterval(showNext, LOBBY_TEASER_INTERVAL_MS)
}

export function stopLobbyTeaser(): void {
	if (timerId) clearInterval(timerId)
	timerId = null
	if (mapRef) clearLobbyMapHint(mapRef)
	mapRef = null
	running = false
	recentIds = []
	recentModes = []
}

export function isLobbyTeaserRunning(): boolean {
	return running
}
