import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID } from '@domain/maps'
import { buildGameConfig } from '@persist'
import { resolveSettingsFromSearch } from '../game_settings_url.ts'

export function parseConfig(search: string): GameConfig {
	return buildGameConfig(resolveSettingsFromSearch(search))
}

export function parseEraId(search: string): string {
	return resolveSettingsFromSearch(search).eraId ?? DEFAULT_ERA_ID
}
