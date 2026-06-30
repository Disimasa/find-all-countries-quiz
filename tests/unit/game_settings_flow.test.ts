import { beforeEach, describe, expect, it } from 'vitest'
import { buildGameConfig, loadGameSettings, saveGameSettings } from '@persist'
import { parseConfig } from '../../src/routes/play/parse_config.ts'
import {
	applyLivesSelection,
	applyTimerSelection,
	parseLivesSelection,
	parseTimerSelection
} from '../../src/routes/ui/game_settings_model.ts'
import { installLocalStorageMock } from './helpers/local_storage_mock.ts'

describe('game settings flow', () => {
	beforeEach(() => {
		installLocalStorageMock()
	})

	it('persists lobby selections and feeds play config through parseConfig', () => {
		let settings = loadGameSettings()

		settings = applyTimerSelection(settings, parseTimerSelection('60'))
		settings = applyLivesSelection(settings, parseLivesSelection('5'))
		saveGameSettings(settings)

		const config = buildGameConfig(loadGameSettings())
		expect(config).toEqual({
			timerEnabled: true,
			timerSeconds: 3600,
			livesEnabled: true,
			maxLives: 5
		})

		expect(parseConfig('')).toEqual(config)
	})

	it('supports infinite timer and lives in persisted flow', () => {
		let settings = loadGameSettings()

		settings = applyTimerSelection(settings, parseTimerSelection('infinite'))
		settings = applyLivesSelection(settings, parseLivesSelection('infinite'))
		saveGameSettings(settings)

		const config = buildGameConfig(loadGameSettings())
		expect(config.timerEnabled).toBe(false)
		expect(config.livesEnabled).toBe(false)
		expect(config.timerSeconds).toBe(1800)
		expect(config.maxLives).toBe(3)

		expect(parseConfig('?timer=0&lives=0')).toEqual({
			timerEnabled: false,
			timerSeconds: 1800,
			livesEnabled: false,
			maxLives: 3
		})
	})

	it('lets query params override stored on/off flags but keep stored durations', () => {
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
})
