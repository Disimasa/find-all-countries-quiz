import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_ERA_ID, MODERN_ERA_ID, PREWW1_ERA_ID } from '@domain/maps'
import { buildPlayHref, eraId } from '../../src/routes/controller.ts'
import { loadGameSettings, saveGameSettings } from '@persist'
import { installLocalStorageMock } from './helpers/local_storage_mock.ts'
import { get } from 'svelte/store'

describe('era settings', () => {
	beforeEach(() => {
		installLocalStorageMock()
		eraId.set(DEFAULT_ERA_ID)
	})

	it('persists eraId in game settings', () => {
		saveGameSettings({
			eraId: PREWW1_ERA_ID,
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 30,
			maxLives: 3
		})
		expect(loadGameSettings().eraId).toBe(PREWW1_ERA_ID)
	})

	it('falls back invalid era to modern', () => {
		saveGameSettings({
			eraId: 'invalid-era',
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 30,
			maxLives: 3
		})
		expect(loadGameSettings().eraId).toBe(MODERN_ERA_ID)
	})

	it('adds era query param only for non-modern play href', () => {
		eraId.set(PREWW1_ERA_ID)
		expect(buildPlayHref()).toContain('era=preww1')
		eraId.set(MODERN_ERA_ID)
		expect(buildPlayHref()).not.toContain('era=')
	})
})
