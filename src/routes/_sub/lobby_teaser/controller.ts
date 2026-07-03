import { mount, unmount } from 'svelte'
import maplibregl, { type Map, type Marker } from 'maplibre-gl'
import { filterTeaserCountryIds, featureCentroid } from '@infrastructure/map/country_centroid'
import type { MapHost } from '@infrastructure/map'
import { getSharedMapEra } from '../../map_era.ts'
import {
	LOBBY_PIN_MODES,
	LOBBY_PIN_START_MODE,
	LOBBY_TEASER_EXCLUDED_COUNTRY_IDS,
	LOBBY_TEASER_INTERVAL_MS,
	LOBBY_TEASER_MAX_CENTROID_LAT,
	LOBBY_TEASER_MIN_BBOX_SPAN
} from './constants.ts'
import { lobbyPinStartCta } from './lobby_pin_start.ts'
import type {
	LobbyMarkerPlacementAction,
	LobbyPinMode,
	LobbyTeaserPinMode
} from './types.ts'
import LobbyMapPin from './ui/LobbyMapPin.svelte'
import type { PinReplayOptions } from './ui/lobby-pin/lobby_pin_controller.ts'
import {
	BUBBLE_ENTER_START_MS,
	BUBBLE_EXIT_START_MS
} from './ui/lobby-pin/constants.ts'

const PICK_PIN_REPLAY: PinReplayOptions = {
	enterMs: BUBBLE_ENTER_START_MS,
	exitMs: BUBBLE_EXIT_START_MS,
	enterAnimation: 'bubble-in-start',
	exitAnimation: 'bubble-out-start'
}

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

export function pickTeaserCountryPool(
	countryIds: readonly string[],
	pickedCountryId: string | null
): string[] {
	if (!pickedCountryId) return [...countryIds]
	return countryIds.filter((id) => id !== pickedCountryId)
}

export function pickNextTeaserMode(recentModes: readonly LobbyTeaserPinMode[]) {
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
	replayPop: (
		mode: LobbyPinMode,
		afterExit?: () => void | Promise<void>,
		replayOptions?: PinReplayOptions
	) => Promise<void>
	destroy: () => void
}

type MarkerSlot = {
	lobby: LobbyMarker | null
	map: Marker | null
}

function createLobbyMarker(): LobbyMarker {
	const root = document.createElement('div')
	let replayPop = async (
		_mode: LobbyPinMode,
		_afterExit?: () => void | Promise<void>,
		_replayOptions?: PinReplayOptions
	) => {}

	const instance = mount(LobbyMapPin, {
		target: root,
		props: {
			registerReplay(
				fn: (
					mode: LobbyPinMode,
					afterExit?: () => void | Promise<void>,
					replayOptions?: PinReplayOptions
				) => Promise<void>
			) {
				replayPop = fn
			}
		}
	})

	return {
		root,
		replayPop: (mode, afterExit, replayOptions) => replayPop(mode, afterExit, replayOptions),
		destroy: () => unmount(instance)
	}
}

function ensurePickMarkerReady(): void {
	if (pickSlot.lobby) return

	pickSlot.lobby = createLobbyMarker()
	pickSlot.map = new maplibregl.Marker({
		element: pickSlot.lobby.root,
		anchor: 'bottom',
		offset: [0, 1]
	})
}

const hintSlot: MarkerSlot = { lobby: null, map: null }
const pickSlot: MarkerSlot = { lobby: null, map: null }

let hintCountryId: string | null = null
let pickedCountryId: string | null = null
let hintSlotGeneration = 0
let pickSlotGeneration = 0
let lobbyTeaserEpoch = 0

function removeMapMarkers(map: Map | null | undefined): void {
	if (!map) return
	for (const el of map.getContainer().querySelectorAll('.maplibregl-marker')) {
		el.remove()
	}
}

function clearMarkerSlot(slot: MarkerSlot): void {
	const marker = slot.map
	const root = slot.lobby?.root
	marker?.remove()
	if (root?.isConnected) {
		const wrapper = root.closest('.maplibregl-marker')
		wrapper?.remove()
		root.remove()
	}
	slot.map = null
	slot.lobby?.destroy()
	slot.lobby = null
}

function isSlotPlacementActive(slot: MarkerSlot, generation: number): boolean {
	return slot === pickSlot
		? generation === pickSlotGeneration
		: generation === hintSlotGeneration
}

export function showLobbyMapHint(
	host: MapHost,
	nextCountryId: string,
	mode: LobbyTeaserPinMode = 'question'
): void {
	if (!host.isReady()) return
	if (nextCountryId === pickedCountryId) return

	const era = host.getEra()
	const map = host.getMap()
	if (!era || !map) return

	hintCountryId = nextCountryId
	void placeMarker(hintSlot, host, map, nextCountryId, mode, () => {
		host.setLobbyHint(nextCountryId)
	})
}

export function clearLobbyMapHint(host: MapHost): void {
	hintSlotGeneration++
	hintCountryId = null
	host.setLobbyHint(null)
	clearMarkerSlot(hintSlot)
}

function clearLobbyPick(host: MapHost | null): void {
	pickSlotGeneration++
	pickedCountryId = null
	host?.setLobbyPick(null)
	clearMarkerSlot(pickSlot)
	lobbyPinStartCta.set(null)
}

export function showLobbyCountryPick(
	host: MapHost,
	countryId: string,
	startLabel: string,
	onStart: () => void
): void {
	if (!host.isReady()) return

	const era = host.getEra()
	const map = host.getMap()
	if (!era || !map) return

	pickedCountryId = countryId
	lobbyPinStartCta.set({ label: startLabel, onStart })
	host.setLobbyPick(countryId)
	ensureTeaserTimerRunning()
	ensurePickMarkerReady()

	const markerOnMap = Boolean(pickSlot.map?.getElement().parentElement)
	void placeMarker(pickSlot, host, map, countryId, LOBBY_PIN_START_MODE, undefined, {
		...PICK_PIN_REPLAY,
		skipExit: markerOnMap
	})
}

function pauseLobbyTeaserCycle(): void {
	if (timerId) clearInterval(timerId)
	timerId = null
}

export function pauseLobbyTeaser(_host: MapHost): void {
	if (pickedCountryId) return
	pauseLobbyTeaserCycle()
}

export function resumeLobbyTeaser(_host: MapHost): void {
	if (!running || !mapRef) return
	ensureTeaserTimerRunning()
}

async function placeMarker(
	slot: MarkerSlot,
	host: MapHost,
	map: Map,
	targetCountryId: string,
	mode: LobbyPinMode,
	onReveal?: () => void,
	replayOptions?: PinReplayOptions
): Promise<void> {
	const era = host.getEra()
	if (!era) return

	const feature = era.getGeoJson().features.find(
		(item) => era.getEntityIdFromFeature(item) === targetCountryId
	)
	const center = feature ? featureCentroid(feature) : null
	if (!center) return

	if (!slot.lobby) {
		slot.lobby = createLobbyMarker()
		slot.map = new maplibregl.Marker({
			element: slot.lobby.root,
			anchor: 'bottom',
			offset: [0, 1]
		})
	}

	const placementGeneration =
		slot === pickSlot ? pickSlotGeneration : hintSlotGeneration
	const marker = slot.map!
	const isFirstMount = !marker.getElement().parentElement
	const plan = planLobbyMarkerPlacement(isFirstMount)
	const isActive = () => isSlotPlacementActive(slot, placementGeneration)

	for (const action of plan) {
		if (action.phase !== 'before-replay') continue
		if (!isActive()) return
		if (action.type === 'set-lng-lat') marker.setLngLat(center)
		if (action.type === 'add-to-map') marker.addTo(map)
	}

	if (!isActive()) return

	await slot.lobby.replayPop(
		mode,
		async () => {
			if (!isActive()) return
			for (const action of plan) {
				if (action.phase !== 'after-exit') continue
				if (action.type === 'set-lng-lat') marker.setLngLat(center)
				if (action.type === 'reveal') onReveal?.()
			}
		},
		replayOptions
	)

	if (!isActive()) {
		marker.remove()
	}
}

let timerId: ReturnType<typeof setInterval> | null = null
let countryIds: string[] = []
let recentIds: string[] = []
let recentModes: LobbyTeaserPinMode[] = []
let running = false
let teaserEraId: string | null = null
let mapRef: MapHost | null = null

function pickNextId(): string | null {
	const pool = pickTeaserCountryPool(countryIds, pickedCountryId)
	if (pool.length === 0) return null

	const result = pickNextTeaserCountryId(pool, recentIds)
	if (!result) return null
	recentIds = result.nextRecent
	return result.pick
}

function pickNextMode(): LobbyTeaserPinMode {
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

function ensureTeaserTimerRunning(): void {
	if (!mapRef || !running || timerId) return
	timerId = setInterval(showNext, LOBBY_TEASER_INTERVAL_MS)
}

export function startLobbyTeaser(map: MapHost): void {
	const era = getSharedMapEra()
	if (!era) return

	const epoch = lobbyTeaserEpoch

	if (running && teaserEraId !== era.id) {
		stopLobbyTeaser(map)
	}

	if (running) {
		ensureTeaserTimerRunning()
		return
	}

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
	if (epoch !== lobbyTeaserEpoch) return

	mapRef = map
	running = true
	teaserEraId = era.id
	recentIds = []
	recentModes = []
	ensurePickMarkerReady()
	showNext()
	ensureTeaserTimerRunning()
}

export function stopLobbyTeaser(host?: MapHost): void {
	lobbyTeaserEpoch++
	if (timerId) clearInterval(timerId)
	timerId = null

	const mapHost = host ?? mapRef
	const map = mapHost?.getMap() ?? null
	hintSlotGeneration++
	pickSlotGeneration++
	hintCountryId = null
	pickedCountryId = null
	mapHost?.setLobbyHint(null)
	mapHost?.setLobbyPick(null)
	clearMarkerSlot(hintSlot)
	clearMarkerSlot(pickSlot)
	removeMapMarkers(map)
	lobbyPinStartCta.set(null)

	mapRef = null
	running = false
	teaserEraId = null
	recentIds = []
	recentModes = []
}

export function isLobbyTeaserRunning(): boolean {
	return running
}

export function getLobbyTeaserEpoch(): number {
	return lobbyTeaserEpoch
}
