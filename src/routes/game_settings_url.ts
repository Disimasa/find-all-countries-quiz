import { browser } from '$app/environment'
import { DEFAULT_ERA_ID, MapEraRegistry } from '@domain/maps'
import {
	clampMaxLives,
	clampTimerMinutes,
	DEFAULT_GAME_SETTINGS,
	mergeGameSettings,
	type GameSettings
} from '@persist'

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

/** True when inbound navigation carries game settings in the query string. */
export function hasLobbySettingsInUrl(search: string): boolean {
	return parseGameSettingsSearch(search) != null
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
				settings.timerMinutes = clampTimerMinutes(minutes)
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
				settings.maxLives = clampMaxLives(count)
			}
		}
	}

	return Object.keys(settings).length > 0 ? settings : null
}

/** URL query merged over defaults (lobby and play). */
export function resolveSettingsFromSearch(search: string): GameSettings {
	const fromUrl = parseGameSettingsSearch(search)
	if (!fromUrl) return { ...DEFAULT_GAME_SETTINGS }
	return mergeGameSettings(DEFAULT_GAME_SETTINGS, fromUrl)
}

/** Cold load: lobby and play read from URL; other routes use defaults. */
export function resolveInitialGameSettings(
	location: Pick<Location, 'pathname' | 'search'> | null = browser ? window.location : null
): GameSettings {
	if (!location) return { ...DEFAULT_GAME_SETTINGS }

	const { pathname, search } = location
	if (pathname === '/' || pathname === '/play') {
		return resolveSettingsFromSearch(search)
	}
	return { ...DEFAULT_GAME_SETTINGS }
}
