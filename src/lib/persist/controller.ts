import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID, MapEraRegistry } from '@domain/maps'
import {
	DEFAULT_GAME_SETTINGS,
	GAME_SAVE_STORAGE_KEY,
	GAME_SETTINGS_STORAGE_KEY,
	gameSaveStorageKey,
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

function parseSavedGame(raw: string): SavedGame | null {
	try {
		const parsed = JSON.parse(raw) as SavedGame
		if (!MapEraRegistry.isKnown(parsed.eraId)) return null
		if (!parsed.progress) return null
		return parsed
	} catch {
		return null
	}
}

function readLegacySave(): SavedGame | null {
	if (!canUseStorage()) return null

	const raw = localStorage.getItem(GAME_SAVE_STORAGE_KEY)
	if (!raw) return null
	return parseSavedGame(raw)
}

function migrateLegacySave(eraId: string): SavedGame | null {
	const legacy = readLegacySave()
	if (!legacy || legacy.eraId !== eraId) return null

	saveGame(legacy)
	return legacy
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
		livesEnabled: normalized.livesEnabled,
		timerSeconds: normalized.timerMinutes * 60,
		maxLives: normalized.maxLives
	}
}

export function loadSavedGame(expectedEraId?: string): SavedGame | null {
	if (!canUseStorage()) return null

	const eraId = expectedEraId ?? loadGameSettings().eraId

	try {
		const raw = localStorage.getItem(gameSaveStorageKey(eraId))
		if (raw) return parseSavedGame(raw)

		return migrateLegacySave(eraId)
	} catch {
		return null
	}
}

export function saveGame(save: SavedGame): void {
	if (!canUseStorage()) return
	localStorage.setItem(gameSaveStorageKey(save.eraId), JSON.stringify(save))
	localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
}

export function clearSavedGame(eraId?: string): void {
	if (!canUseStorage()) return

	if (eraId) {
		localStorage.removeItem(gameSaveStorageKey(eraId))
		const legacy = readLegacySave()
		if (legacy?.eraId === eraId) localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
		return
	}

	localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
	for (const id of MapEraRegistry.listIds()) {
		localStorage.removeItem(gameSaveStorageKey(id))
	}
}
