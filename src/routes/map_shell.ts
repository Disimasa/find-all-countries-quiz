import { get, writable } from 'svelte/store'
import { goto } from '$app/navigation'
import { MapEraRegistry, MODERN_ERA_ID } from '@domain/maps'
import type { GameConfig, GameSnapshot } from '@domain/entities'
import { GeoJsonLoader } from '@infrastructure/data/geo_json_loader'
import { MapRenderer } from '@infrastructure/map'
import {
	destroyGame,
	gameSnapshot,
	getSession,
	mapResetTick,
	startGame
} from './play/controller'
import { parseConfig } from './play/parse_config.ts'
import { MAP_TRANSITION_HOLD_MS } from '@infrastructure/map'

export const mapShellReady = writable(false)
export const mapShellTransitioning = writable(false)

function motionHoldMs(): number {
	if (typeof window === 'undefined') return 0
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MAP_TRANSITION_HOLD_MS
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms))
}

let renderer: MapRenderer | null = null
let selectHandler: ((id: string) => void) | null = null
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

export function initMapShell(el: HTMLElement): Promise<void> {
	notifyMountStarted()

	if (renderer?.isReady()) {
		mapShellReady.set(true)
		renderer.resize()
		return Promise.resolve()
	}

	if (initPromise) return initPromise

	initPromise = (async () => {
		const era = MapEraRegistry.create(MODERN_ERA_ID)
		await era.initialize(new GeoJsonLoader())
		renderer = new MapRenderer()
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
		const snapshot = get(gameSnapshot)
		renderer.activatePlay(handler, snapshot)
	} else {
		renderer.activatePreview()
	}
}

export function updateMapStyles(snapshot: GameSnapshot): void {
	renderer?.updateStyles(snapshot)
}

export function flashWrongOnMap(id: string): void {
	renderer?.flashWrong(id)
}

export async function transitionToPlay(href: string): Promise<void> {
	if (get(mapShellTransitioning)) return

	const map = await ensureReady()
	mapShellTransitioning.set(true)

	try {
		await map.flyToWideView()
		await pause(motionHoldMs())
		await goto(href)
		const config = parseConfig(new URL(href, 'http://local').search)
		await startGame(config)
		if (selectHandler) map.activatePlay(selectHandler, get(gameSnapshot))
		await map.flyToPlayView()
	} finally {
		mapShellTransitioning.set(false)
	}
}

export async function transitionToHome(): Promise<void> {
	if (get(mapShellTransitioning)) return

	const map = await ensureReady()
	mapShellTransitioning.set(true)

	try {
		setMapSelectHandler(null)
		await map.flyToWideView()
		await pause(motionHoldMs())
		destroyGame()
		await goto('/')
		map.activatePreview()
		await map.flyToPreviewView()
	} finally {
		mapShellTransitioning.set(false)
	}
}

export async function enterPlayDirect(config: GameConfig): Promise<void> {
	const map = await ensureReady()
	await startGame(config)
	if (selectHandler) map.activatePlay(selectHandler, get(gameSnapshot))
	await map.flyToPlayView(0)
}
