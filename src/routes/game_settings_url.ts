import { browser } from '$app/environment'
import { DEFAULT_ERA_ID, MapEraRegistry } from '@domain/maps'
import {
	MAX_LIVES_LIMIT,
	MAX_TIMER_MINUTES,
	MIN_LIVES,
	MIN_TIMER_MINUTES
} from '@domain/session/constants'
import { loadGameSettings, saveGameSettings, type GameSettings } from '@persist'

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

export function encodeGameSettingsParams(settings: GameSettings): URLSearchParams {
	const params = new URLSearchParams()

	if (settings.eraId !== DEFAULT_ERA_ID) {
		params.set('era', settings.eraId)
	}

	params.set('timer', settings.timerEnabled ? String(settings.timerMinutes) : '0')
	params.set('lives', settings.livesEnabled ? String(settings.maxLives) : '0')

	return params
}

export function buildLobbyShareHref(settings: GameSettings): string {
	const query = encodeGameSettingsParams(settings).toString()
	return query ? `/?${query}` : '/'
}

export function getLobbySearchForSettings(settings: GameSettings): string {
	const query = encodeGameSettingsParams(settings).toString()
	return query ? `?${query}` : ''
}

export function isLobbySearchInSync(search: string, settings: GameSettings): boolean {
	return search === getLobbySearchForSettings(settings)
}

export function buildPlayHrefFromSettings(settings: GameSettings): string {
	const query = encodeGameSettingsParams(settings).toString()
	return query ? `/play?${query}` : '/play'
}

export function parseGameSettingsSearch(search: string): Partial<GameSettings> | null {
	const params = new URLSearchParams(search)
	if (!params.has('era') && !params.has('timer') && !params.has('lives')) {
		return null
	}

	const settings: Partial<GameSettings> = {}

	if (params.has('era')) {
		const era = params.get('era')
		if (era && MapEraRegistry.isKnown(era)) {
			settings.eraId = era
		}
	}

	if (params.has('timer')) {
		const raw = params.get('timer')
		if (raw === '0') {
			settings.timerEnabled = false
		} else if (raw) {
			const minutes = Number(raw)
			if (Number.isFinite(minutes)) {
				settings.timerEnabled = true
				settings.timerMinutes = clamp(minutes, MIN_TIMER_MINUTES, MAX_TIMER_MINUTES)
			}
		}
	}

	if (params.has('lives')) {
		const raw = params.get('lives')
		if (raw === '0') {
			settings.livesEnabled = false
		} else if (raw) {
			const count = Number(raw)
			if (Number.isFinite(count)) {
				settings.livesEnabled = true
				settings.maxLives = clamp(count, MIN_LIVES, MAX_LIVES_LIMIT)
			}
		}
	}

	return settings
}

export function mergeGameSettings(stored: GameSettings, partial: Partial<GameSettings>): GameSettings {
	return {
		eraId: partial.eraId ?? stored.eraId,
		timerEnabled: partial.timerEnabled ?? stored.timerEnabled,
		timerMinutes: partial.timerMinutes ?? stored.timerMinutes,
		livesEnabled: partial.livesEnabled ?? stored.livesEnabled,
		maxLives: partial.maxLives ?? stored.maxLives
	}
}

export function resolveGameSettingsFromSearch(
	search: string,
	stored: GameSettings = loadGameSettings()
): GameSettings {
	const fromUrl = parseGameSettingsSearch(search)
	if (!fromUrl) return stored
	return mergeGameSettings(stored, fromUrl)
}

/** Applies lobby/play query params before map shell init (browser cold load). */
export function resolveInitialGameSettings(
	location: Pick<Location, 'pathname' | 'search'> | null = browser ? window.location : null
): GameSettings {
	const stored = loadGameSettings()
	if (!location) return stored

	const { pathname, search } = location
	if (pathname !== '/' && pathname !== '/play') return stored

	const fromUrl = parseGameSettingsSearch(search)
	if (!fromUrl) return stored

	const resolved = mergeGameSettings(stored, fromUrl)
	saveGameSettings(resolved)
	return resolved
}
