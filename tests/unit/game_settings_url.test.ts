import { beforeEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'

import { DEFAULT_ERA_ID, CE1300_ERA_ID } from '@domain/maps'
import { DEFAULT_GAME_SETTINGS } from '@persist'

import {
	applyGameSettings,
	buildLobbyShareHref,
	buildPlayHref,
	eraId,
	livesEnabled,
	maxLives,
	timerEnabled,
	timerMinutes
} from '../../src/routes/controller.ts'
import {
	buildLobbyShareHref as buildLobbyShareHrefFromSettings,
	buildPlayHrefFromSettings,
	encodeGameSettingsParams,
	getLobbySearchForSettings,
	isLobbySearchInSync,
	parseGameSettingsSearch
} from '../../src/routes/game_settings_url.ts'
import { installLocalStorageMock } from './helpers/local_storage_mock.ts'

describe('game_settings_url', () => {
	it('encodes era, timer minutes, and lives count', () => {
		const params = encodeGameSettingsParams({
			eraId: CE1300_ERA_ID,
			timerEnabled: true,
			livesEnabled: true,
			timerMinutes: 45,
			maxLives: 5
		})

		expect(params.toString()).toBe('era=ce1300&timer=45&lives=5')
	})

	it('encodes disabled timer and lives as zero', () => {
		const params = encodeGameSettingsParams({
			...DEFAULT_GAME_SETTINGS,
			timerEnabled: false,
			livesEnabled: false
		})

		expect(params.get('timer')).toBe('0')
		expect(params.get('lives')).toBe('0')
		expect(params.has('era')).toBe(false)
	})

	it('parses shared lobby settings from search', () => {
		expect(parseGameSettingsSearch('?era=ce1300&timer=30&lives=3')).toEqual({
			eraId: CE1300_ERA_ID,
			timerEnabled: true,
			timerMinutes: 30,
			livesEnabled: true,
			maxLives: 3
		})
	})

	it('builds lobby search query without path', () => {
		expect(getLobbySearchForSettings(DEFAULT_GAME_SETTINGS)).toBe('?timer=30&lives=3')
	})

	it('returns null when search has no game settings', () => {
		expect(parseGameSettingsSearch('')).toBeNull()
	})

	it('builds lobby and play links from the same settings', () => {
		const settings = {
			eraId: CE1300_ERA_ID,
			timerEnabled: false,
			livesEnabled: true,
			timerMinutes: 30,
			maxLives: 1
		}

		expect(buildLobbyShareHrefFromSettings(settings)).toBe('/?era=ce1300&timer=0&lives=1')
		expect(buildPlayHrefFromSettings(settings)).toBe('/play?era=ce1300&timer=0&lives=1')
	})
})

describe('share settings integration', () => {
	beforeEach(() => {
		installLocalStorageMock()
		applyGameSettings({ ...DEFAULT_GAME_SETTINGS })
	})

	it('builds share and play hrefs from current lobby stores', () => {
		eraId.set(CE1300_ERA_ID)
		timerEnabled.set(false)
		livesEnabled.set(true)
		maxLives.set(5)

		expect(buildLobbyShareHref()).toBe('/?era=ce1300&timer=0&lives=5')
		expect(buildPlayHref()).toBe('/play?era=ce1300&timer=0&lives=5')
	})

	it('applies shared settings to stores', () => {
		applyGameSettings(parseGameSettingsSearch('?era=ce1300&timer=15&lives=1') ?? {})

		expect(get(eraId)).toBe(CE1300_ERA_ID)
		expect(get(timerEnabled)).toBe(true)
		expect(get(timerMinutes)).toBe(15)
		expect(get(livesEnabled)).toBe(true)
		expect(get(maxLives)).toBe(1)
	})

	it('omits modern era from share links', () => {
		eraId.set(DEFAULT_ERA_ID)
		expect(buildLobbyShareHref()).toBe('/?timer=30&lives=3')
	})

	it('detects when lobby search matches settings', () => {
		expect(
			isLobbySearchInSync('?timer=30&lives=3', {
				...DEFAULT_GAME_SETTINGS
			})
		).toBe(true)
		expect(
			isLobbySearchInSync('?era=ce1300&timer=0&lives=1', {
				eraId: CE1300_ERA_ID,
				timerEnabled: false,
				livesEnabled: true,
				timerMinutes: 30,
				maxLives: 1
			})
		).toBe(true)
	})
})
