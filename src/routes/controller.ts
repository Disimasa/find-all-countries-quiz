import { get, writable } from 'svelte/store'
import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID } from '@domain/maps'
import { locale, setLocale, type MessageKey } from '@i18n'
import type { Locale } from '@domain/entities'
import { buildGameConfig, loadSavedGame, type GameSettings, type SavedGame } from '@persist'
import {
	buildLobbyShareHref as buildLobbyShareHrefFromSettings,
	buildPlayHrefFromSettings,
	resolveInitialGameSettings
} from './game_settings_url.ts'

const initialSettings = resolveInitialGameSettings()

export const eraId = writable(initialSettings.eraId ?? DEFAULT_ERA_ID)
export const timerEnabled = writable(initialSettings.timerEnabled)
export const livesEnabled = writable(initialSettings.livesEnabled)
export const timerMinutes = writable(initialSettings.timerMinutes)
export const maxLives = writable(initialSettings.maxLives)

export function getGameSettings(): GameSettings {
	return {
		eraId: get(eraId),
		timerEnabled: get(timerEnabled),
		livesEnabled: get(livesEnabled),
		timerMinutes: get(timerMinutes),
		maxLives: get(maxLives)
	}
}

export function getGameConfig(): GameConfig {
	return buildGameConfig(getGameSettings())
}

export function getSavedGame(): SavedGame | null {
	return loadSavedGame(get(eraId))
}

export function toggleLocale(): void {
	const next: Locale = get(locale) === 'en' ? 'ru' : 'en'
	setLocale(next)
}

export function applyGameSettings(partial: Partial<GameSettings>): void {
	if (partial.eraId != null) eraId.set(partial.eraId)
	if (partial.timerEnabled != null) timerEnabled.set(partial.timerEnabled)
	if (partial.livesEnabled != null) livesEnabled.set(partial.livesEnabled)
	if (partial.timerMinutes != null) timerMinutes.set(partial.timerMinutes)
	if (partial.maxLives != null) maxLives.set(partial.maxLives)
}

export function buildPlayHref(): string {
	return buildPlayHrefFromSettings(getGameSettings())
}

export function buildLobbyShareHref(): string {
	return buildLobbyShareHrefFromSettings(getGameSettings())
}

export type { MessageKey }
