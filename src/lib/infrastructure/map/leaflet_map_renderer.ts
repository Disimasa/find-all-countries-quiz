import type { Feature } from 'geojson'
import type { Layer, Map as LeafletMap, GeoJSON as LeafletGeoJSON, Path } from 'leaflet'
import L from 'leaflet'
import type { BaseMapEra } from '@domain/maps'
import type { EntityVisualState, GameSnapshot } from '@domain/entities'

export class LeafletMapRenderer {
	private map: LeafletMap | null = null
	private layer: LeafletGeoJSON | null = null
	private era: BaseMapEra | null = null
	private onSelect: ((id: string) => void) | null = null
	private snapshot: GameSnapshot | null = null

	mount(el: HTMLElement, era: BaseMapEra, onSelect: (id: string) => void): void {
		this.era = era
		this.onSelect = onSelect

		this.map = L.map(el, {
			center: [20, 0],
			zoom: 2,
			minZoom: 1,
			maxZoom: 8,
			worldCopyJump: true
		})

		L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; OpenStreetMap &copy; CARTO'
		}).addTo(this.map)

		this.layer = L.geoJSON(era.getGeoJson(), {
			style: (feature) => this.styleForFeature(feature as Feature, 'default'),
			onEachFeature: (feature, layer) => this.bindFeature(feature as Feature, layer)
		}).addTo(this.map)

		requestAnimationFrame(() => this.map?.invalidateSize())
	}

	updateStyles(snapshot: GameSnapshot): void {
		this.snapshot = snapshot
		if (!this.layer || !this.era) return

		this.layer.eachLayer((layer) => {
			const feature = (layer as Layer & { feature?: Feature }).feature
			if (!feature) return
			const id = this.era!.getEntityIdFromFeature(feature)
			if (!id) return
			;(layer as Path).setStyle(this.styleForId(id, snapshot))
		})
	}

	resetView(): void {
		this.map?.setView([20, 0], 2)
	}

	destroy(): void {
		this.map?.remove()
		this.map = null
		this.layer = null
	}

	private styleForFeature(feature: Feature, fallback: EntityVisualState) {
		const id = this.era?.getEntityIdFromFeature(feature)
		if (!id || !this.snapshot) return this.era!.getFeatureStyle(fallback)
		return this.styleForId(id, this.snapshot)
	}

	private styleForId(id: string, snapshot: GameSnapshot) {
		let state: EntityVisualState = 'default'
		if (snapshot.guessedIds.has(id)) state = 'guessed'
		else if (snapshot.selectedId === id) state = 'selected'
		return this.era!.getFeatureStyle(state)
	}

	private bindFeature(feature: Feature, layer: Layer): void {
		const id = this.era?.getEntityIdFromFeature(feature)
		if (!id) return

		layer.on({
			click: () => this.onSelect?.(id),
			mouseover: (e) => {
				if (!this.snapshot || this.snapshot.guessedIds.has(id)) return
				;(e.target as Path).setStyle(this.era!.getFeatureStyle('hover'))
			},
			mouseout: () => {
				if (this.snapshot) {
					;(layer as Path).setStyle(this.styleForId(id, this.snapshot))
				}
			}
		})
	}
}
