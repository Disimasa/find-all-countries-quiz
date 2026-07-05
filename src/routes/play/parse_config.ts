import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID } from '@domain/maps'
import { buildGameConfig } from '@persist'
import { resolvePlaySettingsFromSearch } from '../game_settings_url.ts'

export function parseConfig(search: string): GameConfig {
	return buildGameConfig(resolvePlaySettingsFromSearch(search))
}

export function parseEraId(search: string): string {
	return resolvePlaySettingsFromSearch(search).eraId ?? DEFAULT_ERA_ID
}
