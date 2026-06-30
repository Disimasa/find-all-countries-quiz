import { beforeEach, describe, expect, it } from 'vitest'
import { parseConfig } from '../../src/routes/play/parse_config.ts'
import { loadGameSettings, saveGameSettings } from '@persist'
import { installLocalStorageMock } from './helpers/local_storage_mock.ts'

describe('parseConfig', () => {
	beforeEach(() => {
		installLocalStorageMock()
	})

	it('enables timer and lives by default', () => {
		const config = parseConfig('')
		expect(config.timerEnabled).toBe(true)
		expect(config.livesEnabled).toBe(true)
		expect(config.timerSeconds).toBe(1800)
		expect(config.maxLives).toBe(3)
	})

	it('disables options from query', () => {
		const config = parseConfig('?timer=0&lives=0')
		expect(config.timerEnabled).toBe(false)
		expect(config.livesEnabled).toBe(false)
	})

	it('reads custom timerMinutes and maxLives from stored settings', () => {
		saveGameSettings({
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 45,
			maxLives: 5
		})

		const config = parseConfig('')
		expect(config.timerSeconds).toBe(2700)
		expect(config.maxLives).toBe(5)
	})

	it('keeps stored durations when query only toggles timer off', () => {
		saveGameSettings({
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 15,
			maxLives: 1
		})

		expect(parseConfig('?timer=0')).toEqual({
			timerEnabled: false,
			timerSeconds: 900,
			livesEnabled: true,
			maxLives: 1
		})
	})

	it('keeps stored durations when query only toggles lives off', () => {
		saveGameSettings({
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 60,
			maxLives: 5
		})

		expect(parseConfig('?lives=0')).toEqual({
			timerEnabled: true,
			timerSeconds: 3600,
			livesEnabled: false,
			maxLives: 5
		})
	})

	it('falls back to stored on/off flags when query params are absent', () => {
		saveGameSettings({
			timerEnabled: false,
			livesEnabled: false,
			timerMinutes: 30,
			maxLives: 3
		})

		expect(parseConfig('')).toEqual({
			timerEnabled: false,
			timerSeconds: 1800,
			livesEnabled: false,
			maxLives: 3
		})
	})
})
