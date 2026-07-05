import { describe, expect, it } from 'vitest'

import { CE1300_ERA_ID, DEFAULT_ERA_ID, PREWW1_ERA_ID } from '@domain/maps'
import { DEFAULT_GAME_SETTINGS } from '@persist'

import {
	lobbyHrefForSettings,
	lobbySearchForSettings,
	lobbyUrlNeedsUpdate,
	readLobbySettings
} from '../../src/routes/lobby_url.ts'

describe('lobby_url', () => {
	it('reads defaults from bare lobby URL', () => {
		expect(readLobbySettings('')).toEqual(DEFAULT_GAME_SETTINGS)
	})

	it('reads shared lobby settings from search', () => {
		expect(readLobbySettings('?era=ce1300&timer=60&lives=5')).toEqual({
			eraId: CE1300_ERA_ID,
			timerEnabled: true,
			timerMinutes: 60,
			livesEnabled: true,
			maxLives: 5
		})
	})

	it('builds canonical lobby href and search', () => {
		const settings = {
			...DEFAULT_GAME_SETTINGS,
			eraId: CE1300_ERA_ID,
			timerEnabled: false,
			maxLives: 5
		}
		expect(lobbySearchForSettings(settings)).toBe('?era=ce1300&timer=0&lives=5')
		expect(lobbyHrefForSettings(settings)).toBe('/?era=ce1300&timer=0&lives=5')
	})

	it('detects when address bar is behind current lobby settings', () => {
		expect(lobbyUrlNeedsUpdate('?timer=30&lives=3', { ...DEFAULT_GAME_SETTINGS, eraId: PREWW1_ERA_ID })).toBe(
			true
		)
		expect(lobbyUrlNeedsUpdate('?timer=30&lives=3', DEFAULT_GAME_SETTINGS)).toBe(false)
	})
})
