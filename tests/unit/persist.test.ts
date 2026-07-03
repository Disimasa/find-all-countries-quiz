import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
	buildGameConfig,
	clearSavedGame,
	loadGameSettings,
	loadSavedGame,
	saveGame,
	saveGameSettings
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

	it('persists and loads game settings', () => {
		saveGameSettings({
			eraId: 'modern',
			timerEnabled: false,
			livesEnabled: true,
			timerMinutes: 45,
			maxLives: 5
		})
		expect(loadGameSettings()).toEqual({
			eraId: 'modern',
			timerEnabled: false,
			livesEnabled: true,
			timerMinutes: 45,
			maxLives: 5
		})
	})

	it('clamps invalid settings on load', () => {
		saveGameSettings({
			eraId: 'modern',
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 999,
			maxLives: 99
		})
		expect(loadGameSettings()).toEqual({
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
		clearSavedGame()
		expect(loadSavedGame('modern')).toBeNull()
	})
})
