import type { GameConfig } from '@domain/entities'
import { loadGameSettings } from '@persist'

export function parseConfig(search: string): GameConfig {
	const params = new URLSearchParams(search)
	const stored = loadGameSettings()

	return {
		timerEnabled: params.has('timer') ? params.get('timer') !== '0' : stored.timerEnabled,
		timerSeconds: stored.timerMinutes * 60,
		livesEnabled: params.has('lives') ? params.get('lives') !== '0' : stored.livesEnabled,
		maxLives: stored.maxLives
	}
}
