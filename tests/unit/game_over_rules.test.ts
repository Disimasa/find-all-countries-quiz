import { describe, expect, it } from 'vitest'

import { CE1300_ERA_ID, MODERN_ERA_ID } from '@domain/maps'
import { messages } from '@i18n'

import { formatGameRulesLine } from '../../src/routes/play/game_over_rules.ts'

describe('formatGameRulesLine', () => {
	const t = (key: keyof (typeof messages)['en']) => messages.en[key]

	it('joins era, timer, and lives with separators', () => {
		expect(
			formatGameRulesLine(
				CE1300_ERA_ID,
				{
					timerEnabled: true,
					timerSeconds: 1800,
					livesEnabled: false,
					maxLives: 3
				},
				t
			)
		).toBe('1300 AD · 30m · No lives')
	})

	it('uses the modern era label', () => {
		expect(
			formatGameRulesLine(
				MODERN_ERA_ID,
				{
					timerEnabled: false,
					timerSeconds: 1800,
					livesEnabled: true,
					maxLives: 3
				},
				t
			)
		).toBe('Modern · No timer · 3 lives')
	})
})
