import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID, MapEraRegistry } from '@domain/maps'
import {
	DEFAULT_GAME_SETTINGS,
	gameSaveStorageKey,
	MAX_LIVES_LIMIT,
	MAX_TIMER_MINUTES,
	MIN_LIVES,
	MIN_TIMER_MINUTES
} from './constants.ts'
import { canUseStorage } from './storage.ts'
import type { GameSettings, SavedGame, SavedGameProgress } from './types.ts'

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

export function clampTimerMinutes(minutes: number): number {
	return clamp(minutes, MIN_TIMER_MINUTES, MAX_TIMER_MINUTES)
}

export function clampMaxLives(count: number): number {
	return clamp(count, MIN_LIVES, MAX_LIVES_LIMIT)
}

function normalizeEraId(eraId: string | undefined): string {
	if (eraId && MapEraRegistry.isKnown(eraId)) return eraId
	return DEFAULT_ERA_ID
}

export function normalizeGameSettings(raw: Partial<GameSettings>): GameSettings {
	return {
		eraId: normalizeEraId(raw.eraId),
		timerEnabled: raw.timerEnabled ?? DEFAULT_GAME_SETTINGS.timerEnabled,
		livesEnabled: raw.livesEnabled ?? DEFAULT_GAME_SETTINGS.livesEnabled,
		timerMinutes: clampTimerMinutes(raw.timerMinutes ?? DEFAULT_GAME_SETTINGS.timerMinutes),
		maxLives: clampMaxLives(raw.maxLives ?? DEFAULT_GAME_SETTINGS.maxLives)
	}
}

export function mergeGameSettings(
	stored: GameSettings,
	partial: Partial<GameSettings>
): GameSettings {
	return normalizeGameSettings({ ...stored, ...partial })
}

function isValidGameConfig(config: unknown): config is GameConfig {
	if (!config || typeof config !== 'object') return false
	const c = config as GameConfig
	return (
		typeof c.timerEnabled === 'boolean' &&
		typeof c.livesEnabled === 'boolean' &&
		typeof c.timerSeconds === 'number' &&
		Number.isFinite(c.timerSeconds) &&
		typeof c.maxLives === 'number' &&
		Number.isFinite(c.maxLives)
	)
}

function isValidProgress(progress: unknown): progress is SavedGameProgress {
	if (!progress || typeof progress !== 'object') return false
	const p = progress as SavedGameProgress
	return (
		Array.isArray(p.guessedIds) &&
		p.guessedIds.every((id) => typeof id === 'string') &&
		typeof p.livesRemaining === 'number' &&
		Number.isFinite(p.livesRemaining) &&
		(p.timeRemaining === null ||
			(typeof p.timeRemaining === 'number' && Number.isFinite(p.timeRemaining))) &&
		typeof p.total === 'number' &&
		Number.isFinite(p.total) &&
		p.total > 0
	)
}

function parseSavedGame(raw: string): SavedGame | null {
	try {
		const parsed = JSON.parse(raw) as SavedGame
		if (!MapEraRegistry.isKnown(parsed.eraId)) return null
		if (!isValidProgress(parsed.progress)) return null
		if (!isValidGameConfig(parsed.config)) return null
		if (typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt)) return null
		return parsed
	} catch {
		return null
	}
}

export function buildGameConfig(settings: GameSettings): GameConfig {
	const normalized = normalizeGameSettings(settings)
	return {
		timerEnabled: normalized.timerEnabled,
		livesEnabled: normalized.livesEnabled,
		timerSeconds: normalized.timerMinutes * 60,
		maxLives: normalized.maxLives
	}
}

export function loadSavedGame(eraId: string): SavedGame | null {
	if (!canUseStorage()) return null

	try {
		const raw = localStorage.getItem(gameSaveStorageKey(eraId))
		return raw ? parseSavedGame(raw) : null
	} catch {
		return null
	}
}

export function saveGame(save: SavedGame): void {
	if (!canUseStorage()) return
	localStorage.setItem(gameSaveStorageKey(save.eraId), JSON.stringify(save))
}

export function clearSavedGame(eraId?: string): void {
	if (!canUseStorage()) return

	if (eraId) {
		localStorage.removeItem(gameSaveStorageKey(eraId))
		return
	}

	for (const id of MapEraRegistry.listIds()) {
		localStorage.removeItem(gameSaveStorageKey(id))
	}
}
