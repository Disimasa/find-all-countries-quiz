import type { GameConfig } from '@domain/entities'
import { MapEraRegistry } from '@domain/maps'
import type { MessageKey } from '@i18n'

import { formatPlayEraLabel } from './era_display.ts'

export function formatGameRulesLine(
	eraId: string,
	config: GameConfig,
	translate: (key: MessageKey) => string
): string {
	const era = formatPlayEraLabel(eraId, MapEraRegistry.getRegistration(eraId), translate)
	const timer = config.timerEnabled
		? translate('minutesLabel').replace('{n}', String(Math.round(config.timerSeconds / 60)))
		: translate('gameOverModeNoTimer')
	const lives = config.livesEnabled
		? `${config.maxLives} ${translate('lives').toLowerCase()}`
		: translate('gameOverModeNoLives')

	return [era, timer, lives].join(' · ')
}
