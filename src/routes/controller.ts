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

let settingsPersistReady = false

function persistSettings(settings: GameSettings): void {
	saveGameSettings(settings)
}

timerEnabled.subscribe((timerOn) => {
	if (!settingsPersistReady) return
	persistSettings({ timerEnabled: timerOn, livesEnabled: get(livesEnabled) })
})

livesEnabled.subscribe((livesOn) => {
	if (!settingsPersistReady) return
	persistSettings({ timerEnabled: get(timerEnabled), livesEnabled: livesOn })
})

settingsPersistReady = true

export function getGameConfig(): GameConfig {
	return buildGameConfig({
		timerEnabled: get(timerEnabled),
		livesEnabled: get(livesEnabled)
	})
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
