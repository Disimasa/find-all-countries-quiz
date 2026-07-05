import { DEFAULT_ERA_ID } from '@domain/maps'
import {
	DEFAULT_MAX_LIVES,
	DEFAULT_TIMER_MINUTES,
	MAX_LIVES_LIMIT,
	MAX_TIMER_MINUTES,
	MIN_LIVES,
	MIN_TIMER_MINUTES
} from '@domain/session/constants'

export const GAME_SAVE_STORAGE_PREFIX = 'quiz-game-save:'

export function gameSaveStorageKey(eraId: string): string {
	return `${GAME_SAVE_STORAGE_PREFIX}${eraId}`
}

export const DEFAULT_GAME_SETTINGS = {
	eraId: DEFAULT_ERA_ID,
	timerEnabled: true,
	livesEnabled: true,
	timerMinutes: DEFAULT_TIMER_MINUTES,
	maxLives: DEFAULT_MAX_LIVES
} as const

export {
	MIN_TIMER_MINUTES,
	MAX_TIMER_MINUTES,
	MIN_LIVES,
	MAX_LIVES_LIMIT
}
