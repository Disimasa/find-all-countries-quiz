import { describe, expect, it } from 'vitest'
import { buildGameConfig } from '@persist'
import { parseConfig } from '../../src/routes/play/parse_config.ts'
import {
	applyLivesSelection,
	applyTimerSelection,
	parseLivesSelection,
	parseTimerSelection
} from '../../src/routes/ui/game_settings_model.ts'
import { DEFAULT_GAME_SETTINGS } from '@persist'

describe('game settings flow', () => {
	it('maps UI timer/lives selections to play config via URL', () => {
		let settings = { ...DEFAULT_GAME_SETTINGS }
		settings = applyTimerSelection(settings, parseTimerSelection('60'))
		settings = applyLivesSelection(settings, parseLivesSelection('5'))

		const config = buildGameConfig(settings)
		expect(config).toEqual({
			timerEnabled: true,
			timerSeconds: 3600,
			livesEnabled: true,
			maxLives: 5
		})

		expect(parseConfig('?timer=60&lives=5')).toEqual(config)
	})

	it('supports infinite timer and lives via URL flags', () => {
		expect(parseConfig('?timer=0&lives=0')).toEqual({
			timerEnabled: false,
			timerSeconds: 1800,
			livesEnabled: false,
			maxLives: 3
		})
	})

	it('lets query params toggle timer off while keeping default durations', () => {
		expect(parseConfig('?timer=0')).toEqual({
			timerEnabled: false,
			timerSeconds: 1800,
			livesEnabled: true,
			maxLives: 3
		})
	})
})
