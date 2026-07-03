import type { GameConfig } from '@domain/entities'

export interface GameSettings {
	eraId: string
	timerEnabled: boolean
	livesEnabled: boolean
	timerMinutes: number
	maxLives: number
}

export interface SavedGameProgress {
	guessedIds: string[]
	livesRemaining: number
	timeRemaining: number | null
	total: number
}

export interface SavedGame {
	eraId: string
	config: GameConfig
	progress: SavedGameProgress
	savedAt: number
}
