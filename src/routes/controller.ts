import { get, writable } from 'svelte/store'
import type { GameConfig } from '@domain/entities'
import { locale, setLocale, type MessageKey } from '@i18n'
import type { Locale } from '@domain/entities'
import {
	buildGameConfig,
	loadGameSettings,
	loadSavedGame,
	saveGameSettings,
	type GameSettings,
	type SavedGame
} from '@persist'

const initialSettings = loadGameSettings()

export const timerEnabled = writable(initialSettings.timerEnabled)
export const livesEnabled = writable(initialSettings.livesEnabled)
export const timerMinutes = writable(initialSettings.timerMinutes)
export const maxLives = writable(initialSettings.maxLives)

let settingsPersistReady = false

function getCurrentSettings(): GameSettings {
	return {
		timerEnabled: get(timerEnabled),
		livesEnabled: get(livesEnabled),
		timerMinutes: get(timerMinutes),
		maxLives: get(maxLives)
	}
}

function persistSettings(): void {
	saveGameSettings(getCurrentSettings())
}

for (const store of [timerEnabled, livesEnabled, timerMinutes, maxLives]) {
	store.subscribe(() => {
		if (!settingsPersistReady) return
		persistSettings()
	})
}

settingsPersistReady = true

export function getGameConfig(): GameConfig {
	return buildGameConfig(getCurrentSettings())
}

export function getSavedGame(): SavedGame | null {
	return loadSavedGame()
}

export function toggleLocale(): void {
	const next: Locale = get(locale) === 'en' ? 'ru' : 'en'
	setLocale(next)
}

export function buildPlayHref(): string {
	const params = new URLSearchParams()
	if (!get(timerEnabled)) params.set('timer', '0')
	if (!get(livesEnabled)) params.set('lives', '0')
	const query = params.toString()
	return query ? `/play?${query}` : '/play'
}

export type { MessageKey }
