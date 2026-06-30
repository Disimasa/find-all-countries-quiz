import { DEFAULT_TIMER_SECONDS, MAX_LIVES } from '@domain/session/constants'
import type { GameConfig } from '@domain/entities'

export function parseConfig(search: string): GameConfig {
	const params = new URLSearchParams(search)
	return {
		timerEnabled: params.get('timer') !== '0',
		timerSeconds: DEFAULT_TIMER_SECONDS,
		livesEnabled: params.get('lives') !== '0',
		maxLives: MAX_LIVES
	}
}
