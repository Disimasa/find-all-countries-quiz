import type { Map } from 'maplibre-gl'
import type { BaseMapEra } from '@domain/maps'
import type { EntityVisualState } from '@domain/entities'

/** Minimal map surface for overlays (lobby teaser, markers) without importing routes. */
export interface MapHost {
	isReady(): boolean
	getMap(): Map | null
	getEra(): BaseMapEra | null
	setCountryVisual(id: string, visual: EntityVisualState): void
	setLobbyPick(id: string | null): void
	setLobbyHint(id: string | null): void
}
