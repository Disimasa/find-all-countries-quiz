import { describe, expect, it } from 'vitest'
import { parseConfig } from '../../src/routes/play/parse_config.ts'

describe('parseConfig', () => {
	it('enables timer and lives by default', () => {
		const config = parseConfig('')
		expect(config.timerEnabled).toBe(true)
		expect(config.livesEnabled).toBe(true)
	})

	it('disables options from query', () => {
		const config = parseConfig('?timer=0&lives=0')
		expect(config.timerEnabled).toBe(false)
		expect(config.livesEnabled).toBe(false)
	})
})
