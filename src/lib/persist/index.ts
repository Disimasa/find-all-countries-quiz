export {
	GAME_SAVE_STORAGE_PREFIX,
	DEFAULT_GAME_SETTINGS,
	gameSaveStorageKey
} from './constants.ts'
export type { GameSettings, SavedGame, SavedGameProgress } from './types.ts'
export {
	buildGameConfig,
	loadSavedGame,
	saveGame,
	clearSavedGame,
	normalizeGameSettings,
	mergeGameSettings,
	clampTimerMinutes,
	clampMaxLives
} from './controller.ts'
