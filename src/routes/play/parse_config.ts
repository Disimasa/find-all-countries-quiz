import type { GameConfig } from '@domain/entities'
import { DEFAULT_ERA_ID, MapEraRegistry } from '@domain/maps'
import { loadGameSettings, buildGameConfig } from '@persist'
import { parseGameSettingsSearch } from '../game_settings_url.ts'

export function parseConfig(search: string): GameConfig {
	const stored = loadGameSettings()
	const fromUrl = parseGameSettingsSearch(search)
	return buildGameConfig(fromUrl ? { ...stored, ...fromUrl } : stored)
}

export function parseEraId(search: string): string {
	const fromUrl = parseGameSettingsSearch(search)
	if (fromUrl?.eraId) return fromUrl.eraId

	const params = new URLSearchParams(search)
	const era = params.get('era')
	if (era && MapEraRegistry.isKnown(era)) return era
	return loadGameSettings().eraId ?? DEFAULT_ERA_ID
}
