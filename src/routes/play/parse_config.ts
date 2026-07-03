import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID, MapEraRegistry } from '@domain/maps'
import { loadGameSettings } from '@persist'

export function parseConfig(search: string): GameConfig {
	const params = new URLSearchParams(search)
	const stored = loadGameSettings()

	if (params.has('era')) {
		const era = params.get('era')
		if (era && MapEraRegistry.isKnown(era) && era !== stored.eraId) {
			// era query is handled at map shell level; settings may lag one tick
		}
	}

	return {
		timerEnabled: params.has('timer') ? params.get('timer') !== '0' : stored.timerEnabled,
		timerSeconds: stored.timerMinutes * 60,
		livesEnabled: params.has('lives') ? params.get('lives') !== '0' : stored.livesEnabled,
		maxLives: stored.maxLives
	}
}

export function parseEraId(search: string): string {
	const params = new URLSearchParams(search)
	const era = params.get('era')
	if (era && MapEraRegistry.isKnown(era)) return era
	return loadGameSettings().eraId ?? DEFAULT_ERA_ID
}
