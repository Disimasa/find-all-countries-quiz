import { describe, expect, it } from 'vitest'
import {
	applyLivesSelection,
	applyTimerSelection,
	buildLivesSegmentOptions,
	buildLocaleSegmentOptions,
	buildTimerSegmentOptions,
	parseLivesSelection,
	parseTimerSelection,
	SETTINGS_INFINITE_KEY
} from '../../src/routes/ui/game_settings_model.ts'
import { DEFAULT_GAME_SETTINGS } from '@persist'

describe('game_settings_model', () => {
	it('builds locale segment options with active locale', () => {
		expect(buildLocaleSegmentOptions('ru')).toEqual([
			{ key: 'en', label: 'EN', active: false },
			{ key: 'ru', label: 'RU', active: true }
		])
	})

	it('builds timer segments with infinite last when timer disabled', () => {
		const options = buildTimerSegmentOptions(false, 30, 'No limit')
		expect(options.at(-1)).toEqual({
			key: SETTINGS_INFINITE_KEY,
			label: '∞',
			active: true,
			title: 'No limit'
		})
		expect(options.find((option) => option.key === '30')?.active).toBe(false)
	})

	it('marks selected timer preset as active', () => {
		const options = buildTimerSegmentOptions(true, 60, 'No limit')
		expect(options.find((option) => option.key === '60')?.active).toBe(true)
		expect(options.at(-1)?.active).toBe(false)
	})

	it('builds lives segments with infinite last when lives disabled', () => {
		const options = buildLivesSegmentOptions(false, 3, 'No limit')
		expect(options.find((option) => option.key === '3')?.active).toBe(false)
		expect(options.at(-1)?.active).toBe(true)
	})

	it('parses timer selection for preset and infinite', () => {
		expect(parseTimerSelection('45')).toEqual({ enabled: true, minutes: 45 })
		expect(parseTimerSelection(SETTINGS_INFINITE_KEY)).toEqual({ enabled: false })
	})

	it('parses lives selection for count and infinite', () => {
		expect(parseLivesSelection('5')).toEqual({ enabled: true, count: 5 })
		expect(parseLivesSelection(SETTINGS_INFINITE_KEY)).toEqual({ enabled: false })
	})

	it('applies timer selection while keeping previous minutes for infinite', () => {
		const next = applyTimerSelection(
			{ ...DEFAULT_GAME_SETTINGS, timerMinutes: 45 },
			{ enabled: false }
		)
		expect(next).toEqual({
			...DEFAULT_GAME_SETTINGS,
			timerEnabled: false,
			timerMinutes: 45
		})
	})

	it('applies lives selection while keeping previous count for infinite', () => {
		const next = applyLivesSelection(
			{ ...DEFAULT_GAME_SETTINGS, maxLives: 5 },
			{ enabled: false }
		)
		expect(next).toEqual({
			...DEFAULT_GAME_SETTINGS,
			livesEnabled: false,
			maxLives: 5
		})
	})

	it('applies finite timer and lives selections', () => {
		const timerNext = applyTimerSelection(DEFAULT_GAME_SETTINGS, { enabled: true, minutes: 15 })
		const livesNext = applyLivesSelection(DEFAULT_GAME_SETTINGS, { enabled: true, count: 1 })

		expect(timerNext.timerEnabled).toBe(true)
		expect(timerNext.timerMinutes).toBe(15)
		expect(livesNext.livesEnabled).toBe(true)
		expect(livesNext.maxLives).toBe(1)
	})
})
