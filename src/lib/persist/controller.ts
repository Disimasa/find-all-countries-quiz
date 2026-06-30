import type { GameConfig } from '@domain/entities'
import { MODERN_ERA_ID } from '@domain/maps'
import { DEFAULT_TIMER_SECONDS, MAX_LIVES } from '@domain/session/constants'
import {
	DEFAULT_GAME_SETTINGS,
	GAME_SAVE_STORAGE_KEY,
	GAME_SETTINGS_STORAGE_KEY
} from './constants.ts'
import { canUseStorage } from './storage.ts'
import type { GameSettings, SavedGame } from './types.ts'

export function loadGameSettings(): GameSettings {
	if (!canUseStorage()) return { ...DEFAULT_GAME_SETTINGS }

	try {
		const raw = localStorage.getItem(GAME_SETTINGS_STORAGE_KEY)
		if (!raw) return { ...DEFAULT_GAME_SETTINGS }
		const parsed = JSON.parse(raw) as Partial<GameSettings>
		return {
			timerEnabled: parsed.timerEnabled ?? DEFAULT_GAME_SETTINGS.timerEnabled,
			livesEnabled: parsed.livesEnabled ?? DEFAULT_GAME_SETTINGS.livesEnabled
		}
	} catch {
		return { ...DEFAULT_GAME_SETTINGS }
	}
}

export function saveGameSettings(settings: GameSettings): void {
	if (!canUseStorage()) return
	localStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function buildGameConfig(settings: GameSettings): GameConfig {
	return {
		timerEnabled: settings.timerEnabled,
		timerSeconds: DEFAULT_TIMER_SECONDS,
		livesEnabled: settings.livesEnabled,
		maxLives: MAX_LIVES
	}
}

export function loadSavedGame(): SavedGame | null {
	if (!canUseStorage()) return null

	try {
		const raw = localStorage.getItem(GAME_SAVE_STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as SavedGame
		if (parsed.eraId !== MODERN_ERA_ID) return null
		if (!parsed.progress) return null
		return parsed
	} catch {
		return null
	}
}

export function saveGame(save: SavedGame): void {
	if (!canUseStorage()) return
	localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(save))
}

export function clearSavedGame(): void {
	if (!canUseStorage()) return
	localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
}
