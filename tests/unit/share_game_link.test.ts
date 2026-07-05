import { describe, expect, it } from 'vitest'

import { CE1300_ERA_ID } from '@domain/maps'

import {
	buildLobbyShareUrl,
	gameConfigToSettings
} from '../../src/routes/play/share_game_link.ts'

describe('share_game_link', () => {
	it('builds lobby share url from active game config', () => {
		const config = {
			timerEnabled: false,
			timerSeconds: 1800,
			livesEnabled: true,
			maxLives: 5
		}

		expect(gameConfigToSettings(CE1300_ERA_ID, config)).toEqual({
			eraId: CE1300_ERA_ID,
			timerEnabled: false,
			livesEnabled: true,
			timerMinutes: 30,
			maxLives: 5
		})

		expect(buildLobbyShareUrl('https://quiz.example', CE1300_ERA_ID, config)).toBe(
			'https://quiz.example/?era=ce1300&timer=0&lives=5'
		)
	})
})
