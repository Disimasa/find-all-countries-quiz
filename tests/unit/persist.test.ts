import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
	buildGameConfig,
	clearSavedGame,
	loadSavedGame,
	normalizeGameSettings,
	saveGame
} from '@persist'

describe('persist', () => {
	const store: Record<string, string> = {}

	beforeEach(() => {
		for (const key of Object.keys(store)) delete store[key]
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => store[key] ?? null,
			setItem: (key: string, value: string) => {
				store[key] = value
			},
			removeItem: (key: string) => {
				delete store[key]
			}
		})
		clearSavedGame()
	})

	it('normalizes and clamps game settings', () => {
		expect(
			normalizeGameSettings({
				eraId: 'modern',
				timerEnabled: false,
				livesEnabled: true,
				timerMinutes: 45,
				maxLives: 5
			})
		).toEqual({
			eraId: 'modern',
			timerEnabled: false,
			livesEnabled: true,
			timerMinutes: 45,
			maxLives: 5
		})
	})

	it('clamps invalid settings on normalize', () => {
		expect(
			normalizeGameSettings({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 999,
				maxLives: 99
			})
		).toEqual({
			eraId: 'modern',
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 120,
			maxLives: 10
		})
	})

	it('builds config from settings', () => {
		const config = buildGameConfig({
			eraId: 'modern',
			timerEnabled: false,
			livesEnabled: false,
			timerMinutes: 15,
			maxLives: 2
		})
		expect(config.timerEnabled).toBe(false)
		expect(config.livesEnabled).toBe(false)
		expect(config.timerSeconds).toBe(900)
		expect(config.maxLives).toBe(2)
	})

	it('maps timerMinutes to timerSeconds for custom durations', () => {
		expect(
			buildGameConfig({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 60,
				maxLives: 5
			})
		).toEqual({
			timerEnabled: true,
			timerSeconds: 3600,
			livesEnabled: true,
			maxLives: 5
		})
	})

	it('preserves maxLives from settings', () => {
		const config = buildGameConfig({
			eraId: 'modern',
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 10,
			maxLives: 1
		})
		expect(config.maxLives).toBe(1)
		expect(config.timerSeconds).toBe(600)
	})

	it('persists and loads in-progress game', () => {
		saveGame({
			eraId: 'modern',
			config: buildGameConfig({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['DE', 'FR'],
				livesRemaining: 2,
				timeRemaining: 900,
				total: 195
			},
			savedAt: Date.now()
		})

		const saved = loadSavedGame('modern')
		expect(saved?.progress.guessedIds).toEqual(['DE', 'FR'])
		expect(saved?.progress.total).toBe(195)
	})

	it('returns null when saved era mismatches expected era', () => {
		saveGame({
			eraId: 'preww1',
			config: buildGameConfig({
				eraId: 'preww1',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['germany-prussia'],
				livesRemaining: 3,
				timeRemaining: null,
				total: 142
			},
			savedAt: Date.now()
		})
		expect(loadSavedGame('modern')).toBeNull()
	})

	it('retains save for original era while another era is selected in lobby', () => {
		saveGame({
			eraId: 'modern',
			config: buildGameConfig({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['DE', 'FR'],
				livesRemaining: 2,
				timeRemaining: 900,
				total: 195
			},
			savedAt: Date.now()
		})

		expect(loadSavedGame('preww1')).toBeNull()
		expect(loadSavedGame('modern')?.progress.guessedIds).toEqual(['DE', 'FR'])
	})

	it('keeps era A save when starting a new game on era B', () => {
		saveGame({
			eraId: 'ce1300',
			config: buildGameConfig({
				eraId: 'ce1300',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['moscow', 'novgorod'],
				livesRemaining: 2,
				timeRemaining: 1200,
				total: 72
			},
			savedAt: Date.now()
		})

		clearSavedGame('modern')

		expect(loadSavedGame('ce1300')?.progress.guessedIds).toEqual(['moscow', 'novgorod'])

		saveGame({
			eraId: 'modern',
			config: buildGameConfig({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['DE'],
				livesRemaining: 3,
				timeRemaining: null,
				total: 195
			},
			savedAt: Date.now()
		})

		expect(loadSavedGame('modern')?.progress.guessedIds).toEqual(['DE'])
		expect(loadSavedGame('ce1300')?.progress.guessedIds).toEqual(['moscow', 'novgorod'])
	})

	it('clears saved game for one era only', () => {
		saveGame({
			eraId: 'modern',
			config: buildGameConfig({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['DE'],
				livesRemaining: 3,
				timeRemaining: null,
				total: 195
			},
			savedAt: Date.now()
		})
		saveGame({
			eraId: 'preww1',
			config: buildGameConfig({
				eraId: 'preww1',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['germany-prussia'],
				livesRemaining: 2,
				timeRemaining: 900,
				total: 142
			},
			savedAt: Date.now()
		})

		clearSavedGame('modern')
		expect(loadSavedGame('modern')).toBeNull()
		expect(loadSavedGame('preww1')?.progress.guessedIds).toEqual(['germany-prussia'])
	})

	it('clears all era saves when era is omitted', () => {
		saveGame({
			eraId: 'modern',
			config: buildGameConfig({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['DE'],
				livesRemaining: 3,
				timeRemaining: null,
				total: 195
			},
			savedAt: Date.now()
		})
		saveGame({
			eraId: 'ce1300',
			config: buildGameConfig({
				eraId: 'ce1300',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['moscow'],
				livesRemaining: 3,
				timeRemaining: null,
				total: 72
			},
			savedAt: Date.now()
		})

		clearSavedGame()
		expect(loadSavedGame('modern')).toBeNull()
		expect(loadSavedGame('ce1300')).toBeNull()
	})

	it('clears saved game', () => {
		saveGame({
			eraId: 'modern',
			config: buildGameConfig({
				eraId: 'modern',
				timerEnabled: true,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 3
			}),
			progress: {
				guessedIds: ['DE'],
				livesRemaining: 3,
				timeRemaining: null,
				total: 195
			},
			savedAt: Date.now()
		})
		clearSavedGame('modern')
		expect(loadSavedGame('modern')).toBeNull()
	})

	it('rejects save with invalid config', () => {
		localStorage.setItem(
			'quiz-game-save:modern',
			JSON.stringify({
				eraId: 'modern',
				config: { timerEnabled: true },
				progress: {
					guessedIds: ['DE'],
					livesRemaining: 3,
					timeRemaining: null,
					total: 195
				},
				savedAt: Date.now()
			})
		)
		expect(loadSavedGame('modern')).toBeNull()
	})

	it('rejects save with invalid progress', () => {
		localStorage.setItem(
			'quiz-game-save:modern',
			JSON.stringify({
				eraId: 'modern',
				config: buildGameConfig({
					eraId: 'modern',
					timerEnabled: true,
					livesEnabled: true,
					timerMinutes: 30,
					maxLives: 3
				}),
				progress: {
					guessedIds: 'DE',
					livesRemaining: 3,
					timeRemaining: null,
					total: 0
				},
				savedAt: Date.now()
			})
		)
		expect(loadSavedGame('modern')).toBeNull()
	})
})
