import type { Map } from 'maplibre-gl'
import type { BaseMapEra } from '@domain/maps'
import type { EntityVisualState } from '@domain/entities'
import type { LOBBY_PIN_MODES } from './constants.ts'

export type LobbyPinMode = (typeof LOBBY_PIN_MODES)[number]

export interface LobbyMapHost {
	isReady(): boolean
	getMap(): Map | null
	getEra(): BaseMapEra | null
	setCountryVisual(id: string, visual: EntityVisualState): void
}

export type LobbyMarkerPlacementPhase = 'before-replay' | 'after-exit'

export interface LobbyMarkerPlacementAction {
	phase: LobbyMarkerPlacementPhase
	type: 'set-lng-lat' | 'add-to-map' | 'reveal'
}
