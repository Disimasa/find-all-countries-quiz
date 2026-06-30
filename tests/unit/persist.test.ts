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
		saveGameSettings({ timerEnabled: false, livesEnabled: true })
		expect(loadGameSettings()).toEqual({ timerEnabled: false, livesEnabled: true })
	})

	it('builds config from settings', () => {
		const config = buildGameConfig({ timerEnabled: false, livesEnabled: false })
		expect(config.timerEnabled).toBe(false)
		expect(config.livesEnabled).toBe(false)
	})

	it('persists and loads in-progress game', () => {
		saveGame({
			eraId: 'modern',
			config: buildGameConfig({ timerEnabled: true, livesEnabled: true }),
			progress: {
				guessedIds: ['DE', 'FR'],
				livesRemaining: 2,
				timeRemaining: 900,
				total: 195
			},
			savedAt: Date.now()
		})

		const saved = loadSavedGame()
		expect(saved?.progress.guessedIds).toEqual(['DE', 'FR'])
		expect(saved?.progress.total).toBe(195)
	})

	it('clears saved game', () => {
		saveGame({
			eraId: 'modern',
			config: buildGameConfig({ timerEnabled: true, livesEnabled: true }),
			progress: {
				guessedIds: ['DE'],
				livesRemaining: 3,
				timeRemaining: null,
				total: 195
			},
			savedAt: Date.now()
		})
		clearSavedGame()
		expect(loadSavedGame()).toBeNull()
	})
})
