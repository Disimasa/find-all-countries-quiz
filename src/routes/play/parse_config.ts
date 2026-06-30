import { DEFAULT_TIMER_SECONDS, MAX_LIVES } from '@domain/session/constants'
import type { GameConfig } from '@domain/entities'
import { loadGameSettings } from '@persist'

export function parseConfig(search: string): GameConfig {
	const params = new URLSearchParams(search)
	const stored = loadGameSettings()

	return {
		timerEnabled: params.has('timer') ? params.get('timer') !== '0' : stored.timerEnabled,
		timerSeconds: DEFAULT_TIMER_SECONDS,
		livesEnabled: params.has('lives') ? params.get('lives') !== '0' : stored.livesEnabled,
		maxLives: MAX_LIVES
	}
}
