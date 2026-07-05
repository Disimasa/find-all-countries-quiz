import { beforeEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'

import { DEFAULT_ERA_ID, CE1300_ERA_ID, PREWW1_ERA_ID } from '@domain/maps'
import { DEFAULT_GAME_SETTINGS, mergeGameSettings } from '@persist'

import {
	applyGameSettings,
	buildLobbyShareHref,
	buildPlayHref,
	eraId,
	getGameSettings,
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
	hasLobbySettingsInUrl,
	isLobbySearchInSync,
	parseGameSettingsSearch,
	resolveInitialGameSettings,
	resolveSettingsFromSearch
} from '../../src/routes/game_settings_url.ts'

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

	it('returns null when era param is unknown', () => {
		expect(parseGameSettingsSearch('?era=ce1279')).toBeNull()
	})

	it('returns null when search has no game settings', () => {
		expect(parseGameSettingsSearch('')).toBeNull()
	})

	it('ignores unknown era param', () => {
		expect(parseGameSettingsSearch('?era=ce1279&timer=30&lives=3')).toEqual({
			timerEnabled: true,
			timerMinutes: 30,
			livesEnabled: true,
			maxLives: 3
		})
	})

	it('clamps timer and lives to allowed limits', () => {
		expect(parseGameSettingsSearch('?timer=999&lives=99')).toEqual({
			timerEnabled: true,
			timerMinutes: 120,
			livesEnabled: true,
			maxLives: 10
		})
	})

	it('parses disabled timer and lives from zero params', () => {
		expect(parseGameSettingsSearch('?timer=0&lives=0')).toEqual({
			timerEnabled: false,
			livesEnabled: false
		})
	})

	it('parses era-only search', () => {
		expect(parseGameSettingsSearch('?era=preww1')).toEqual({
			eraId: PREWW1_ERA_ID
		})
	})

	it('resolveSettingsFromSearch uses defaults for omitted params', () => {
		expect(resolveSettingsFromSearch('?era=ce1300')).toEqual({
			...DEFAULT_GAME_SETTINGS,
			eraId: CE1300_ERA_ID
		})
	})

	it('resolveSettingsFromSearch merges full query', () => {
		expect(resolveSettingsFromSearch('?era=ce1300&timer=60&lives=5')).toEqual({
			eraId: CE1300_ERA_ID,
			timerEnabled: true,
			timerMinutes: 60,
			livesEnabled: true,
			maxLives: 5
		})
	})

	it('resolveInitialGameSettings reads lobby URL', () => {
		expect(
			resolveInitialGameSettings({
				pathname: '/',
				search: '?era=ce1300&timer=60&lives=5'
			})
		).toEqual({
			eraId: CE1300_ERA_ID,
			timerEnabled: true,
			timerMinutes: 60,
			livesEnabled: true,
			maxLives: 5
		})
	})

	it('resolveInitialGameSettings uses defaults on bare lobby URL', () => {
		expect(
			resolveInitialGameSettings({
				pathname: '/',
				search: ''
			})
		).toEqual(DEFAULT_GAME_SETTINGS)
	})

	it('resolveInitialGameSettings ignores URL on non-lobby paths', () => {
		expect(
			resolveInitialGameSettings({
				pathname: '/explore',
				search: '?era=ce1300&timer=60&lives=5'
			})
		).toEqual(DEFAULT_GAME_SETTINGS)
	})

	it('resolveInitialGameSettings reads play URL', () => {
		expect(
			resolveInitialGameSettings({
				pathname: '/play',
				search: '?era=ce1300&timer=60&lives=5'
			})
		).toEqual({
			eraId: CE1300_ERA_ID,
			timerEnabled: true,
			timerMinutes: 60,
			livesEnabled: true,
			maxLives: 5
		})
	})

	it('mergeGameSettings keeps stored fields when partial omits them', () => {
		const stored = {
			...DEFAULT_GAME_SETTINGS,
			eraId: PREWW1_ERA_ID,
			timerMinutes: 45,
			maxLives: 2
		}
		expect(mergeGameSettings(stored, { eraId: CE1300_ERA_ID })).toEqual({
			...stored,
			eraId: CE1300_ERA_ID
		})
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
		expect(isLobbySearchInSync('?timer=30&lives=3', { ...DEFAULT_GAME_SETTINGS })).toBe(true)
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

	it('hasLobbySettingsInUrl is false for bare lobby path', () => {
		expect(hasLobbySettingsInUrl('')).toBe(false)
	})

	it('hasLobbySettingsInUrl is true when any game param is present', () => {
		expect(hasLobbySettingsInUrl('?era=ce1300')).toBe(true)
		expect(hasLobbySettingsInUrl('?timer=30&lives=3')).toBe(true)
	})

	it('bare lobby search is not in sync and needs canonical push', () => {
		expect(isLobbySearchInSync('', DEFAULT_GAME_SETTINGS)).toBe(false)
		expect(hasLobbySettingsInUrl('')).toBe(false)
	})

	it('getGameSettings reflects current lobby stores', () => {
		eraId.set(CE1300_ERA_ID)
		timerEnabled.set(false)
		timerMinutes.set(60)
		livesEnabled.set(true)
		maxLives.set(5)

		expect(getGameSettings()).toEqual({
			eraId: CE1300_ERA_ID,
			timerEnabled: false,
			timerMinutes: 60,
			livesEnabled: true,
			maxLives: 5
		})
	})
})
