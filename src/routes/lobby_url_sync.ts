import type { GameSettings } from '@persist'
import {
	buildLobbyShareHref,
	getLobbySearchForSettings,
	parseGameSettingsSearch
} from './game_settings_url.ts'

export function shouldApplyLobbySearchFromUrl(
	search: string,
	syncedLobbySearch: string | null
): boolean {
	return search !== syncedLobbySearch
}

/** Inbound URL → settings. Always returns syncedSearch (even when search is empty). */
export function parseLobbySearchSync(search: string): {
	settings: Partial<GameSettings> | null
	syncedSearch: string
} {
	return {
		settings: parseGameSettingsSearch(search),
		syncedSearch: search
	}
}

export function initialLobbySyncedSearch(search: string): string {
	return search
}

export function resolveLobbyUrlPush(
	currentSearch: string,
	settings: GameSettings
): {
	targetSearch: string
	href: string
	shouldReplace: boolean
	syncedSearch: string
} {
	const targetSearch = getLobbySearchForSettings(settings)
	return {
		targetSearch,
		href: buildLobbyShareHref(settings),
		shouldReplace: currentSearch !== targetSearch,
		syncedSearch: targetSearch
	}
}

export function shouldSwitchMapEraFromUrl(
	fromUrl: Partial<GameSettings> | null,
	currentEraId: string
): string | null {
	if (!fromUrl?.eraId || fromUrl.eraId === currentEraId) return null
	return fromUrl.eraId
}
