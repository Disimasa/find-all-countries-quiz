import type { LOBBY_PIN_MODES, LOBBY_PIN_START_MODE } from './constants.ts'

export type LobbyTeaserPinMode = (typeof LOBBY_PIN_MODES)[number]
export type LobbyPinMode = LobbyTeaserPinMode | typeof LOBBY_PIN_START_MODE

export type LobbyMarkerPlacementPhase = 'before-replay' | 'after-exit'

export interface LobbyMarkerPlacementAction {
	phase: LobbyMarkerPlacementPhase
	type: 'set-lng-lat' | 'add-to-map' | 'reveal'
}
