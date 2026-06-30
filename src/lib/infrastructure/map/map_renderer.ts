import maplibregl, { type GeoJSONSource, type Map } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { BaseMapEra } from '@domain/maps'
import type { EntityVisualState, GameSnapshot } from '@domain/entities'
import { buildCountryBorderPaint, buildCountryPaint, readMapTheme } from '@theme'
import { baseCountryVisual, countryVisual, resolveHoverableCountryId } from './hover_state.ts'
import { applyBasemapTheme, prepareBasemapStyle } from './basemap_theme.ts'
import {
	COUNTRIES_FILL_LAYER_ID,
	COUNTRIES_LINE_LAYER_ID,
	COUNTRIES_SOURCE_ID,
	COUNTRY_ID_PROPERTY,
	HIDDEN_BOUNDARY_LAYER_IDS,
	MAP_FIT_PADDING,
	MAP_DEFAULT_MAX_FIT_ZOOM,
	MAP_WIDE_FIT_PADDING,
	MAP_WIDE_MAX_ZOOM,
	MAP_TRANSITION_OUT_MS,
	MAP_TRANSITION_IN_MS,
	MAP_TRANSITION_HOLD_MS,
	MAP_MAX_ZOOM,
	MAP_MIN_ZOOM,
	MAP_STYLE_URL,
	MAP_TRACKPAD_ZOOM_RATE,
	MAP_WHEEL_ZOOM_RATE,
	MAP_WORLD_BOUNDS
} from './constants.ts'

const WRONG_FLASH_SEQUENCE: readonly EntityVisualState[] = ['wrong', 'selected', 'wrong', 'selected']
const WRONG_FLASH_STEP_MS = 95
const EASE_IN_CUBIC = (t: number) => t * t * t
const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function motionDuration(ms: number): number {
	return prefersReducedMotion() ? 0 : ms
}

export class MapRenderer {
	private map: Map | null = null
	private era: BaseMapEra | null = null
	private onSelect: ((id: string) => void) | null = null
	private snapshot: GameSnapshot | null = null
	private hoveredId: string | null = null
	private flashingId: string | null = null
	private flashToken = 0
	private ready = false
	private interactive = false

	mountShell(el: HTMLElement, era: BaseMapEra, onReady?: () => void): void {
		this.era = era
		this.onSelect = null
		this.snapshot = null
		this.interactive = false

		this.map = new maplibregl.Map({
			container: el,
			style: MAP_STYLE_URL,
			transformStyle: prepareBasemapStyle,
			bounds: MAP_WORLD_BOUNDS,
			fitBoundsOptions: {
				padding: MAP_FIT_PADDING,
				maxZoom: MAP_DEFAULT_MAX_FIT_ZOOM,
				animate: false
			},
			minZoom: MAP_MIN_ZOOM,
			maxZoom: MAP_MAX_ZOOM,
			interactive: false,
			attributionControl: { compact: true },
			renderWorldCopies: true,
			dragRotate: false,
			pitchWithRotate: false,
			touchPitch: false,
			maxPitch: 0,
			fadeDuration: 0,
			reduceMotion: false
		})

		this.map.once('style.load', () => this.hideBasemapOverlays())

		this.map.once('load', () => {
			if (!this.map) return

			this.map.scrollZoom.setWheelZoomRate(MAP_WHEEL_ZOOM_RATE)
			this.map.scrollZoom.setZoomRate(MAP_TRACKPAD_ZOOM_RATE)
			this.hideBasemapOverlays()
			applyBasemapTheme(this.map)
			this.addCountryLayers(era.getGeoJson())
			this.bindInteractions()
			this.initDefaultFeatureStates()
			this.ready = true
			requestAnimationFrame(() => {
				this.map?.resize()
				this.applyDefaultView()
				requestAnimationFrame(() => onReady?.())
			})
		})
	}

	setInteractive(enabled: boolean, onSelect?: (id: string) => void): void {
		this.interactive = enabled
		if (onSelect) this.onSelect = onSelect
		if (!this.map) return

		const handlers = [
			this.map.dragPan,
			this.map.scrollZoom,
			this.map.doubleClickZoom,
			this.map.boxZoom,
			this.map.keyboard,
			this.map.touchZoomRotate
		]
		for (const handler of handlers) {
			if (enabled) handler.enable()
			else handler.disable()
		}

		if (!enabled) {
			this.clearHover()
			this.map.getCanvas().style.cursor = ''
		}
	}

	activatePlay(onSelect: (id: string) => void, snapshot: GameSnapshot): void {
		this.setInteractive(true, onSelect)
		this.updateStyles(snapshot)
	}

	activatePreview(): void {
		this.setInteractive(false)
		this.snapshot = null
		this.initDefaultFeatureStates()
	}

	isReady(): boolean {
		return this.ready
	}

	resize(): void {
		this.map?.resize()
	}

	flyToWideView(duration = MAP_TRANSITION_OUT_MS): Promise<void> {
		return this.flyToBounds(MAP_WIDE_FIT_PADDING, MAP_WIDE_MAX_ZOOM, duration, EASE_IN_CUBIC)
	}

	flyToPlayView(duration = MAP_TRANSITION_IN_MS): Promise<void> {
		return this.flyToBounds(MAP_FIT_PADDING, MAP_DEFAULT_MAX_FIT_ZOOM, duration, EASE_OUT_CUBIC)
	}

	flyToPreviewView(duration = MAP_TRANSITION_IN_MS): Promise<void> {
		return this.flyToBounds(MAP_FIT_PADDING, MAP_DEFAULT_MAX_FIT_ZOOM, duration, EASE_OUT_CUBIC)
	}

	private flyToBounds(
		padding: number,
		maxZoom: number,
		duration: number,
		easing: (t: number) => number = EASE_OUT_CUBIC
	): Promise<void> {
		return new Promise((resolve) => {
			if (!this.map) {
				resolve()
				return
			}

			const ms = motionDuration(duration)
			const camera = this.map.cameraForBounds(MAP_WORLD_BOUNDS, { padding, maxZoom })

			if (ms === 0 || !camera) {
				if (camera) {
					this.map.jumpTo({ center: camera.center, zoom: camera.zoom, bearing: 0, pitch: 0 })
				} else {
					this.map.fitBounds(MAP_WORLD_BOUNDS, { padding, maxZoom, animate: false })
				}
				resolve()
				return
			}

			const onEnd = () => {
				this.map?.off('moveend', onEnd)
				resolve()
			}
			this.map.once('moveend', onEnd)
			this.map.flyTo({
				center: camera.center,
				zoom: camera.zoom,
				bearing: 0,
				pitch: 0,
				duration: ms,
				easing,
				essential: true
			})
		})
	}

	updateStyles(snapshot: GameSnapshot): void {
		this.snapshot = snapshot
		if (!this.ready) return
		this.syncFeatureStates()
	}

	resetView(): void {
		void this.flyToPlayView(500)
	}

	flashWrong(id: string): void {
		if (!this.ready || !this.map) return

		const token = ++this.flashToken
		this.flashingId = id

		for (const [index, visual] of WRONG_FLASH_SEQUENCE.entries()) {
			window.setTimeout(() => {
				if (token !== this.flashToken || !this.map) return
				this.setFeatureVisual(id, visual)
				if (index === WRONG_FLASH_SEQUENCE.length - 1) {
					this.flashingId = null
				}
			}, WRONG_FLASH_STEP_MS * index)
		}
	}

	getMinZoom(): number | null {
		return this.map?.getMinZoom() ?? null
	}

	destroy(): void {
		this.flashToken++
		this.flashingId = null
		this.map?.remove()
		this.map = null
		this.era = null
		this.ready = false
		this.interactive = false
	}

	private initDefaultFeatureStates(): void {
		if (!this.map || !this.era) return

		for (const feature of this.era.getGeoJson().features) {
			const id = this.era.getEntityIdFromFeature(feature)
			if (id) this.setFeatureVisual(id, 'default')
		}
	}

	private applyDefaultView(): void {
		this.map?.fitBounds(MAP_WORLD_BOUNDS, {
			padding: MAP_FIT_PADDING,
			animate: false,
			maxZoom: MAP_DEFAULT_MAX_FIT_ZOOM
		})
	}

	private hideBasemapOverlays(): void {
		if (!this.map) return
		for (const layer of this.map.getStyle().layers ?? []) {
			if (layer.type === 'symbol') {
				this.map.setLayoutProperty(layer.id, 'visibility', 'none')
			}
		}

		for (const layerId of HIDDEN_BOUNDARY_LAYER_IDS) {
			if (this.map.getLayer(layerId)) {
				this.map.setLayoutProperty(layerId, 'visibility', 'none')
			}
		}
	}

	private addCountryLayers(geoJson: FeatureCollection): void {
		if (!this.map) return

		const paint = buildCountryPaint(readMapTheme())
		const borderPaint = buildCountryBorderPaint(readMapTheme())

		this.map.addSource(COUNTRIES_SOURCE_ID, {
			type: 'geojson',
			data: geoJson,
			promoteId: COUNTRY_ID_PROPERTY
		})

		this.map.addLayer({
			id: COUNTRIES_FILL_LAYER_ID,
			type: 'fill',
			source: COUNTRIES_SOURCE_ID,
			paint: {
				'fill-color': paint.fillColor,
				'fill-opacity': paint.fillOpacity,
				'fill-outline-color': paint.fillOutlineColor,
				'fill-antialias': true
			}
		})

		this.map.addLayer({
			id: COUNTRIES_LINE_LAYER_ID,
			type: 'line',
			source: COUNTRIES_SOURCE_ID,
			paint: {
				'line-color': borderPaint.lineColor,
				'line-width': borderPaint.lineWidth,
				'line-opacity': borderPaint.lineOpacity
			}
		})
	}

	private bindInteractions(): void {
		if (!this.map) return

		this.map.on('click', COUNTRIES_FILL_LAYER_ID, (event) => {
			if (!this.interactive) return
			const feature = event.features?.[0]
			if (!feature || !this.era) return
			const id = this.era.getEntityIdFromFeature(feature)
			if (!id || this.snapshot?.guessedIds.has(id)) return
			this.onSelect?.(id)
		})

		this.map.on('mousemove', (event) => {
			if (!this.interactive) return
			this.updateHoverAtPoint(event.point)
		})

		this.map.on('mouseout', () => {
			this.clearHover()
			if (this.map) this.map.getCanvas().style.cursor = ''
		})

		this.map.on('dragstart', () => this.clearHover())
		this.map.on('zoomstart', () => this.clearHover())
	}

	private updateHoverAtPoint(point: maplibregl.PointLike): void {
		if (!this.map || !this.era) return

		const features = this.map.queryRenderedFeatures(point, {
			layers: [COUNTRIES_FILL_LAYER_ID]
		})
		const feature = features[0]
		const id = feature ? this.era.getEntityIdFromFeature(feature) : null
		const hoverableId = resolveHoverableCountryId(
			id,
			this.snapshot?.guessedIds ?? new Set(),
			this.snapshot?.selectedId ?? null
		)

		if (hoverableId === this.hoveredId) {
			this.map.getCanvas().style.cursor = hoverableId ? 'pointer' : ''
			return
		}

		this.clearHover()

		if (hoverableId) {
			this.hoveredId = hoverableId
			this.setFeatureVisual(hoverableId, this.visualFor(hoverableId))
			this.map.getCanvas().style.cursor = 'pointer'
			return
		}

		this.map.getCanvas().style.cursor = ''
	}

	private syncFeatureStates(): void {
		if (!this.map || !this.era || !this.snapshot) return

		const source = this.map.getSource(COUNTRIES_SOURCE_ID) as GeoJSONSource | undefined
		if (!source) return

		for (const feature of this.era.getGeoJson().features) {
			const id = this.era.getEntityIdFromFeature(feature)
			if (!id || id === this.flashingId) continue
			this.setFeatureVisual(id, this.visualFor(id))
		}
	}

	private clearHover(): void {
		if (!this.hoveredId) return
		const id = this.hoveredId
		this.hoveredId = null
		this.setFeatureVisual(id, this.baseVisualFor(id))
	}

	private baseVisualFor(id: string) {
		return baseCountryVisual(id, this.snapshot)
	}

	private visualFor(id: string) {
		return countryVisual(id, this.snapshot, this.hoveredId)
	}

	private setFeatureVisual(id: string, visual: EntityVisualState): void {
		this.map?.setFeatureState({ source: COUNTRIES_SOURCE_ID, id }, { visual })
	}
}
