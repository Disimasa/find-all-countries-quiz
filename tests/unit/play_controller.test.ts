import { describe, expect, it } from 'vitest'
import { CE1300_ERA_ID, PREWW1_ERA_ID } from '@domain/maps'
import { parseConfig, parseEraId } from '../../src/routes/play/parse_config.ts'

describe('parseConfig', () => {
	it('enables timer and lives by default', () => {
		const config = parseConfig('')
		expect(config.timerEnabled).toBe(true)
		expect(config.livesEnabled).toBe(true)
		expect(config.timerSeconds).toBe(1800)
		expect(config.maxLives).toBe(3)
	})

	it('reads timer and lives values from query', () => {
		const config = parseConfig('?era=ce1300&timer=45&lives=5')
		expect(config.timerEnabled).toBe(true)
		expect(config.timerSeconds).toBe(2700)
		expect(config.livesEnabled).toBe(true)
		expect(config.maxLives).toBe(5)
	})

	it('disables options from query', () => {
		const config = parseConfig('?timer=0&lives=0')
		expect(config.timerEnabled).toBe(false)
		expect(config.livesEnabled).toBe(false)
	})

	it('keeps default durations when query only toggles timer off', () => {
		expect(parseConfig('?timer=0')).toEqual({
			timerEnabled: false,
			timerSeconds: 1800,
			livesEnabled: true,
			maxLives: 3
		})
	})

	it('keeps default durations when query only toggles lives off', () => {
		expect(parseConfig('?lives=0')).toEqual({
			timerEnabled: true,
			timerSeconds: 1800,
			livesEnabled: false,
			maxLives: 3
		})
	})

	it('uses era from query', () => {
		expect(parseEraId('?era=ce1300')).toBe(CE1300_ERA_ID)
		expect(parseConfig('?era=ce1300&timer=60&lives=5').maxLives).toBe(5)
	})

	it('merges era from URL with default timer and lives', () => {
		expect(parseConfig('?era=preww1')).toEqual({
			timerEnabled: true,
			timerSeconds: 1800,
			livesEnabled: true,
			maxLives: 3
		})
	})
})
