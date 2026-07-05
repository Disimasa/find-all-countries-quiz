import type { GameSettings } from '@persist'
import {
	buildLobbyShareHref,
	getLobbySearchForSettings,
	resolveLobbySettingsFromSearch
} from './game_settings_url.ts'

/** Lobby: full settings encoded in `/?era=&timer=&lives=`. */
export function readLobbySettings(search: string): GameSettings {
	return resolveLobbySettingsFromSearch(search)
}

export function lobbyHrefForSettings(settings: GameSettings): string {
	return buildLobbyShareHref(settings)
}

export function lobbySearchForSettings(settings: GameSettings): string {
	return getLobbySearchForSettings(settings)
}

export function lobbyUrlNeedsUpdate(search: string, settings: GameSettings): boolean {
	return search !== getLobbySearchForSettings(settings)
}
