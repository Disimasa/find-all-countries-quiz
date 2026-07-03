import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID, MapEraRegistry } from '@domain/maps'
import {
	DEFAULT_GAME_SETTINGS,
	GAME_SAVE_STORAGE_KEY,
	GAME_SETTINGS_STORAGE_KEY,
	MAX_LIVES_LIMIT,
	MAX_TIMER_MINUTES,
	MIN_LIVES,
	MIN_TIMER_MINUTES
} from './constants.ts'
import { canUseStorage } from './storage.ts'
import type { GameSettings, SavedGame } from './types.ts'

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

function normalizeEraId(eraId: string | undefined): string {
	if (eraId && MapEraRegistry.isKnown(eraId)) return eraId
	return DEFAULT_ERA_ID
}

function normalizeSettings(raw: Partial<GameSettings>): GameSettings {
	return {
		eraId: normalizeEraId(raw.eraId),
		timerEnabled: raw.timerEnabled ?? DEFAULT_GAME_SETTINGS.timerEnabled,
		livesEnabled: raw.livesEnabled ?? DEFAULT_GAME_SETTINGS.livesEnabled,
		timerMinutes: clamp(
			raw.timerMinutes ?? DEFAULT_GAME_SETTINGS.timerMinutes,
			MIN_TIMER_MINUTES,
			MAX_TIMER_MINUTES
		),
		maxLives: clamp(raw.maxLives ?? DEFAULT_GAME_SETTINGS.maxLives, MIN_LIVES, MAX_LIVES_LIMIT)
	}
}

export function loadGameSettings(): GameSettings {
	if (!canUseStorage()) return { ...DEFAULT_GAME_SETTINGS }

	try {
		const raw = localStorage.getItem(GAME_SETTINGS_STORAGE_KEY)
		if (!raw) return { ...DEFAULT_GAME_SETTINGS }
		return normalizeSettings(JSON.parse(raw) as Partial<GameSettings>)
	} catch {
		return { ...DEFAULT_GAME_SETTINGS }
	}
}

export function saveGameSettings(settings: GameSettings): void {
	if (!canUseStorage()) return
	localStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)))
}

export function buildGameConfig(settings: GameSettings): GameConfig {
	const normalized = normalizeSettings(settings)
	return {
		timerEnabled: normalized.timerEnabled,
		timerSeconds: normalized.timerMinutes * 60,
		livesEnabled: normalized.livesEnabled,
		maxLives: normalized.maxLives
	}
}

export function loadSavedGame(expectedEraId?: string): SavedGame | null {
	if (!canUseStorage()) return null

	try {
		const raw = localStorage.getItem(GAME_SAVE_STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as SavedGame
		if (!MapEraRegistry.isKnown(parsed.eraId)) return null
		if (!parsed.progress) return null
		const eraId = expectedEraId ?? loadGameSettings().eraId
		if (parsed.eraId !== eraId) return null
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
