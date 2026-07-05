import maplibregl, { type GeoJSONSource, type Map } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { BaseMapEra } from '@domain/maps'
import type { EntityVisualState, GameSnapshot, Locale } from '@domain/entities'
import { buildCountryBorderPaint, buildCountryPaint, readMapTheme } from '@theme'
import type { MapHost } from './map_host.ts'
import {
	baseCountryVisual,
	countryVisual,
	resolveGuessedTooltipId,
	resolveHoverableCountryId
} from './hover_state.ts'
import { expandFeatureBounds, featureBounds } from './country_centroid.ts'
import { applyBasemapTheme, prepareBasemapStyle } from './basemap_theme.ts'
import {
	buildEraMapLabelLayerOptions,
	buildExploreEraLabelsCollection,
	EXPLORE_ERA_LABELS_LAYER_ID,
	EXPLORE_ERA_LABELS_SOURCE_ID,
	isBasemapCountryLabelLayerId
} from './explore_country_labels.ts'
import { lobbyCountryVisual, lobbyHoverableCountryId } from './lobby_feature_state.ts'
import { isClickOnMapMarker } from './marker_click_guard.ts'
import {
	COUNTRIES_FILL_LAYER_ID,
	COUNTRIES_LINE_LAYER_ID,
	COUNTRIES_SOURCE_ID,
	COUNTRY_ID_PROPERTY,
	HIDDEN_BOUNDARY_LAYER_IDS,
	MAP_COUNTRY_FOCUS_DURATION_MS,
	MAP_COUNTRY_FOCUS_MARGIN_RATIO,
	MAP_COUNTRY_FOCUS_MAX_ZOOM,
	MAP_COUNTRY_FOCUS_MIN_MARGIN_DEG,
	MAP_COUNTRY_FOCUS_PADDING,
	MAP_FIT_PADDING,
	MAP_DEFAULT_MAX_FIT_ZOOM,
	MAP_WIDE_FIT_PADDING,
	MAP_WIDE_MAX_ZOOM,
	MAP_TRANSITION_OUT_MS,
	MAP_TRANSITION_IN_MS,
	MAP_MAX_ZOOM,
	MAP_MIN_ZOOM,
	MAP_STYLE_URL,
	MAP_TRACKPAD_ZOOM_RATE,
	MAP_WHEEL_ZOOM_RATE,
	MAP_WORLD_BOUNDS
} from './constants.ts'

const WRONG_FLASH_SEQUENCE: readonly EntityVisualState[] = ['wrong', 'selected', 'wrong', 'selected']
const WRONG_FLASH_STEP_MS = 95
const EASE_IN_OUT_CUBIC = (t: number) =>
	t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3)
const EASE_OUT_BACK = (t: number) => {
	const c1 = 1.85
	const c3 = c1 + 1
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function motionDuration(ms: number): number {
	return prefersReducedMotion() ? 0 : ms
}

export class MapRenderer implements MapHost {
	private map: Map | null = null
	private era: BaseMapEra | null = null
	private onSelect: ((id: string) => void) | null = null
	private snapshot: GameSnapshot | null = null
	private hoveredId: string | null = null
	private guessedTooltip: maplibregl.Marker | null = null
	private guessedTooltipEl: HTMLElement | null = null
	private tooltipCountryId: string | null = null
	private tooltipVisible = false
	private flashingId: string | null = null
	private flashToken = 0
	private ready = false
	private interactive = false
	private lobbyMode = false
	private exploreMode = false
	private exploreLocale: Locale = 'en'
	private lobbySelectedId: string | null = null
	private lobbyHintId: string | null = null
	private onLobbyNavigate: (() => void) | null = null
	private onLobbyNavigateEnd: (() => void) | null = null

	getMap(): Map | null {
		return this.map
	}

	getEra(): BaseMapEra | null {
		return this.era
	}

	setCountryVisual(id: string, visual: EntityVisualState): void {
		this.setFeatureVisual(id, visual)
	}

	setLobbyPick(id: string | null): void {
		this.lobbySelectedId = id
		if (!this.lobbyMode || !this.hasCountriesSource()) return
		this.syncLobbyFeatureStates()
	}

	setLobbyHint(id: string | null): void {
		this.lobbyHintId = id
		if (!this.lobbyMode || !this.hasCountriesSource()) return
		this.syncLobbyFeatureStates()
	}

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

		this.bindAttributionCollapse()

		this.map.once('style.load', () => this.hideBasemapOverlays())

		this.map.once('load', () => {
			if (!this.map) return

			this.map.scrollZoom.setWheelZoomRate(MAP_WHEEL_ZOOM_RATE)
			this.map.scrollZoom.setZoomRate(MAP_TRACKPAD_ZOOM_RATE)
			this.hideBasemapOverlays()
			applyBasemapTheme(this.map)
			this.addCountryLayers(era.getGeoJson())
			this.addExploreEraLabelLayer()
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
			this.hideGuessedTooltip()
			this.map.getCanvas().style.cursor = ''
		}
	}

	activatePlay(onSelect: (id: string) => void, snapshot: GameSnapshot): Promise<void> {
		this.exploreMode = false
		this.hideBasemapSymbolLayers()
		this.lobbyMode = false
		this.lobbySelectedId = null
		this.lobbyHintId = null
		this.onLobbyNavigate = null
		this.onLobbyNavigateEnd = null
		this.unbindLobbyNavigation()
		this.setInteractive(true, onSelect)
		this.snapshot = snapshot
		return this.waitForCountriesSourceData().then(() => {
			if (!this.ready) return
			this.syncFeatureStates()
		})
	}

	setLobbySelection(id: string | null): void {
		this.setLobbyPick(id)
	}

	activatePreview(): void {
		this.activateLobby(() => {})
	}

	activateLobby(
		onCountryClick: (id: string) => void,
		onNavigate?: () => void,
		onNavigateEnd?: () => void
	): void {
		this.exploreMode = false
		this.hideBasemapSymbolLayers()
		this.lobbyMode = true
		this.lobbySelectedId = null
		this.lobbyHintId = null
		this.onLobbyNavigate = onNavigate ?? null
		this.onLobbyNavigateEnd = onNavigateEnd ?? null
		this.snapshot = null
		this.hideGuessedTooltip()
		this.setInteractive(true, onCountryClick)
		this.syncLobbyFeatureStates()
		this.bindLobbyNavigation()
	}

	activateExplore(locale: Locale): void {
		this.exploreMode = true
		this.exploreLocale = locale
		this.lobbyMode = false
		this.lobbySelectedId = null
		this.lobbyHintId = null
		this.onLobbyNavigate = null
		this.onLobbyNavigateEnd = null
		this.unbindLobbyNavigation()
		this.snapshot = null
		this.hideGuessedTooltip()
		this.clearHover()
		this.setInteractive(true, () => {})
		this.syncExploreFeatureStates()
		this.showBasemapSymbolLayers()
		void this.flyToPreviewView()
	}

	updateExploreLabels(locale: Locale): void {
		if (!this.exploreMode) return
		this.exploreLocale = locale
		this.syncExploreEraLabels()
	}

	isReady(): boolean {
		return this.ready
	}

	resize(): void {
		this.map?.resize()
	}

	swapEra(era: BaseMapEra): Promise<void> {
		this.era = era
		this.hoveredId = null
		this.flashingId = null
		this.lobbySelectedId = null
		this.lobbyHintId = null

		if (this.map?.getSource(COUNTRIES_SOURCE_ID)) {
			this.replaceCountryLayers(era.getGeoJson())
			return this.waitForCountriesSourceData().then(() => {
				this.applyEraFeatureStatesAfterSwap()
				this.refreshTheme()
			})
		}

		this.applyEraFeatureStatesAfterSwap()
		this.refreshTheme()
		return Promise.resolve()
	}

	refreshTheme(): void {
		if (!this.map) return
		applyBasemapTheme(this.map)
		const theme = readMapTheme()
		const paint = buildCountryPaint(theme)
		const borderPaint = buildCountryBorderPaint(theme)
		if (this.map.getLayer(COUNTRIES_FILL_LAYER_ID)) {
			this.map.setPaintProperty(COUNTRIES_FILL_LAYER_ID, 'fill-color', paint.fillColor)
			this.map.setPaintProperty(COUNTRIES_FILL_LAYER_ID, 'fill-opacity', paint.fillOpacity)
			this.map.setPaintProperty(
				COUNTRIES_FILL_LAYER_ID,
				'fill-outline-color',
				paint.fillOutlineColor
			)
		}
		if (this.map.getLayer(COUNTRIES_LINE_LAYER_ID)) {
			this.map.setPaintProperty(COUNTRIES_LINE_LAYER_ID, 'line-color', borderPaint.lineColor)
			this.map.setPaintProperty(COUNTRIES_LINE_LAYER_ID, 'line-width', borderPaint.lineWidth)
			this.map.setPaintProperty(COUNTRIES_LINE_LAYER_ID, 'line-opacity', borderPaint.lineOpacity)
		}
	}

	flyToWideView(duration = MAP_TRANSITION_OUT_MS): Promise<void> {
		return this.flyToBounds(
			MAP_WORLD_BOUNDS,
			MAP_WIDE_FIT_PADDING,
			MAP_WIDE_MAX_ZOOM,
			duration,
			EASE_IN_OUT_CUBIC
		)
	}

	flyToPlayView(duration = MAP_TRANSITION_IN_MS): Promise<void> {
		return this.flyToBounds(
			MAP_WORLD_BOUNDS,
			MAP_FIT_PADDING,
			MAP_DEFAULT_MAX_FIT_ZOOM,
			duration,
			EASE_OUT_BACK
		)
	}

	flyToPreviewView(duration = MAP_TRANSITION_IN_MS): Promise<void> {
		return this.flyToBounds(MAP_WORLD_BOUNDS, MAP_FIT_PADDING, MAP_DEFAULT_MAX_FIT_ZOOM, duration, EASE_OUT_BACK)
	}

	flyToCountry(countryId: string, duration = MAP_COUNTRY_FOCUS_DURATION_MS): Promise<void> {
		if (!this.map || !this.era) return Promise.resolve()

		const feature = this.era.getGeoJson().features.find(
			(item) => this.era!.getEntityIdFromFeature(item) === countryId
		)
		if (!feature) return Promise.resolve()

		const bounds = featureBounds(feature)
		if (!bounds) return Promise.resolve()

		const focusBounds = expandFeatureBounds(
			bounds,
			MAP_COUNTRY_FOCUS_MARGIN_RATIO,
			MAP_COUNTRY_FOCUS_MIN_MARGIN_DEG
		)

		return this.flyToBounds(
			focusBounds,
			MAP_COUNTRY_FOCUS_PADDING,
			MAP_COUNTRY_FOCUS_MAX_ZOOM,
			duration,
			EASE_OUT_CUBIC
		)
	}

	private flyToBounds(
		bounds: [number, number, number, number],
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
			const camera = this.map.cameraForBounds(bounds, { padding, maxZoom })

			if (ms === 0 || !camera) {
				if (camera) {
					this.map.jumpTo({ center: camera.center, zoom: camera.zoom, bearing: 0, pitch: 0 })
				} else {
					this.map.fitBounds(bounds, { padding, maxZoom, animate: false })
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
		if (this.lobbyMode || !this.ready || !this.hasCountriesSource()) return
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
		this.unbindLobbyNavigation()
		this.guessedTooltip?.remove()
		this.guessedTooltip = null
		this.guessedTooltipEl = null
		this.tooltipCountryId = null
		this.tooltipVisible = false
		this.map?.remove()
		this.map = null
		this.era = null
		this.ready = false
		this.interactive = false
		this.lobbyMode = false
		this.exploreMode = false
		this.lobbySelectedId = null
		this.lobbyHintId = null
		this.onLobbyNavigate = null
		this.onLobbyNavigateEnd = null
	}

	private collapseMapAttribution(): void {
		const el = this.map?.getContainer().querySelector('details.maplibregl-ctrl-attrib')
		if (!(el instanceof HTMLDetailsElement)) return
		el.open = false
		el.classList.remove('maplibregl-compact-show')
	}

	private bindAttributionCollapse(): void {
		if (!this.map) return

		const collapse = () => this.collapseMapAttribution()
		this.map.on('sourcedata', (event) => {
			if (event.sourceDataType === 'metadata') queueMicrotask(collapse)
		})
		this.map.once('load', collapse)
	}

	private onLobbyDragStart = (): void => {
		this.onLobbyNavigate?.()
	}

	private onLobbyZoomStart = (): void => {
		this.onLobbyNavigate?.()
	}

	private onLobbyDragEnd = (): void => {
		this.onLobbyNavigateEnd?.()
	}

	private onLobbyZoomEnd = (): void => {
		this.onLobbyNavigateEnd?.()
	}

	private bindLobbyNavigation(): void {
		if (!this.map) return
		this.map.on('dragstart', this.onLobbyDragStart)
		this.map.on('zoomstart', this.onLobbyZoomStart)
		this.map.on('dragend', this.onLobbyDragEnd)
		this.map.on('zoomend', this.onLobbyZoomEnd)
	}

	private unbindLobbyNavigation(): void {
		if (!this.map) return
		this.map.off('dragstart', this.onLobbyDragStart)
		this.map.off('zoomstart', this.onLobbyZoomStart)
		this.map.off('dragend', this.onLobbyDragEnd)
		this.map.off('zoomend', this.onLobbyZoomEnd)
	}

	private syncLobbyFeatureStates(): void {
		if (!this.map || !this.era || !this.lobbyMode) return

		for (const feature of this.era.getGeoJson().features) {
			const id = this.era.getEntityIdFromFeature(feature)
			if (!id) continue
			const visual = lobbyCountryVisual(id, this.lobbySelectedId, this.lobbyHintId)
			this.setFeatureVisual(id, visual)
		}
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
		this.hideBasemapSymbolLayers()
		this.hideBasemapBoundaries()
	}

	private hideBasemapSymbolLayers(): void {
		this.setBasemapSymbolLayersVisible(false)
	}

	private showBasemapSymbolLayers(): void {
		if (!this.map) return
		for (const layer of this.map.getStyle().layers ?? []) {
			if (layer.type !== 'symbol' || !this.map.getLayer(layer.id)) continue
			if (isBasemapCountryLabelLayerId(layer.id)) {
				this.map.setLayoutProperty(layer.id, 'visibility', 'none')
			}
		}
		this.syncExploreEraLabels()
		if (this.map.getLayer(EXPLORE_ERA_LABELS_LAYER_ID)) {
			this.map.setLayoutProperty(EXPLORE_ERA_LABELS_LAYER_ID, 'visibility', 'visible')
			this.map.moveLayer(EXPLORE_ERA_LABELS_LAYER_ID)
		}
	}

	private syncExploreEraLabels(): void {
		if (!this.map || !this.era) return
		const source = this.map.getSource(EXPLORE_ERA_LABELS_SOURCE_ID) as GeoJSONSource | undefined
		if (!source) return
		source.setData(buildExploreEraLabelsCollection(this.era, this.exploreLocale))
	}

	private hideBasemapBoundaries(): void {
		if (!this.map) return
		for (const layerId of HIDDEN_BOUNDARY_LAYER_IDS) {
			if (this.map.getLayer(layerId)) {
				this.map.setLayoutProperty(layerId, 'visibility', 'none')
			}
		}
	}

	private setBasemapSymbolLayersVisible(visible: boolean): void {
		if (!this.map) return
		for (const layer of this.map.getStyle().layers ?? []) {
			if (layer.type !== 'symbol' || layer.id === EXPLORE_ERA_LABELS_LAYER_ID) continue
			this.map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none')
		}
		if (this.map.getLayer(EXPLORE_ERA_LABELS_LAYER_ID)) {
			this.map.setLayoutProperty(
				EXPLORE_ERA_LABELS_LAYER_ID,
				'visibility',
				visible && this.exploreMode ? 'visible' : 'none'
			)
		}
	}

	private replaceCountryLayers(geoJson: FeatureCollection): void {
		if (!this.map) return

		if (this.map.getLayer(COUNTRIES_LINE_LAYER_ID)) {
			this.map.removeLayer(COUNTRIES_LINE_LAYER_ID)
		}
		if (this.map.getLayer(COUNTRIES_FILL_LAYER_ID)) {
			this.map.removeLayer(COUNTRIES_FILL_LAYER_ID)
		}
		if (this.map.getSource(COUNTRIES_SOURCE_ID)) {
			this.map.removeSource(COUNTRIES_SOURCE_ID)
		}

		this.addCountryLayers(geoJson)
	}

	private addCountryLayers(geoJson: FeatureCollection): void {
		if (!this.map) return

		const theme = readMapTheme()
		const paint = buildCountryPaint(theme)
		const borderPaint = buildCountryBorderPaint(theme)

		this.map.addSource(COUNTRIES_SOURCE_ID, {
			type: 'geojson',
			data: geoJson,
			promoteId: this.era?.getFeatureIdProperty() ?? COUNTRY_ID_PROPERTY
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

	private addExploreEraLabelLayer(): void {
		if (!this.map || !this.era) return

		this.map.addSource(EXPLORE_ERA_LABELS_SOURCE_ID, {
			type: 'geojson',
			data: buildExploreEraLabelsCollection(this.era, this.exploreLocale)
		})

		const labelLayer = buildEraMapLabelLayerOptions()
		this.map.addLayer({
			id: EXPLORE_ERA_LABELS_LAYER_ID,
			type: 'symbol',
			source: EXPLORE_ERA_LABELS_SOURCE_ID,
			layout: {
				...labelLayer.layout,
				visibility: 'none'
			},
			paint: labelLayer.paint
		})
	}

	private syncExploreFeatureStates(): void {
		if (!this.map || !this.era) return

		for (const feature of this.era.getGeoJson().features) {
			const id = this.era.getEntityIdFromFeature(feature)
			if (id) this.setFeatureVisual(id, 'default')
		}
	}

	private bindInteractions(): void {
		if (!this.map) return

		this.map.on('click', COUNTRIES_FILL_LAYER_ID, (event) => {
			if (!this.interactive) return
			if (this.exploreMode) return
			if (isClickOnMapMarker(event.originalEvent.target)) return
			const feature = event.features?.[0]
			if (!feature || !this.era) return
			const id = this.era.getEntityIdFromFeature(feature)
			if (!id) return
			if (!this.lobbyMode && this.snapshot?.guessedIds.has(id)) return
			this.onSelect?.(id)
		})

		this.map.on('mousemove', (event) => {
			if (!this.interactive) return
			this.updateHoverAtPoint(event.point)
		})

		this.map.on('mouseout', () => {
			this.clearHover()
			this.hideGuessedTooltip()
			if (this.map) this.map.getCanvas().style.cursor = ''
		})

		this.map.on('dragstart', () => {
			this.clearHover()
			this.hideGuessedTooltip()
		})
		this.map.on('zoomstart', () => {
			this.clearHover()
			this.hideGuessedTooltip()
		})
	}

	private updateHoverAtPoint(point: maplibregl.PointLike): void {
		if (!this.map || !this.era) return

		const features = this.map.queryRenderedFeatures(point, {
			layers: [COUNTRIES_FILL_LAYER_ID]
		})
		const feature = features[0]
		const id = feature ? this.era.getEntityIdFromFeature(feature) : null

		if (this.exploreMode) {
			this.updateExploreHoverAtPoint(id)
			return
		}

		if (this.lobbyMode) {
			this.updateLobbyHoverAtPoint(id)
			return
		}

		this.updateGuessedTooltip(id, point)

		const hoverableId = resolveHoverableCountryId(
			id,
			this.snapshot?.guessedIds ?? new Set(),
			this.snapshot?.selectedId ?? null
		)
		const guessedTooltipId = resolveGuessedTooltipId(id, this.snapshot?.guessedIds ?? new Set())

		if (hoverableId === this.hoveredId) {
			this.map.getCanvas().style.cursor = hoverableId || guessedTooltipId ? 'pointer' : ''
			return
		}

		this.clearHover()

		if (hoverableId) {
			this.hoveredId = hoverableId
			this.setFeatureVisual(hoverableId, this.visualFor(hoverableId))
			this.map.getCanvas().style.cursor = 'pointer'
			return
		}

		this.map.getCanvas().style.cursor = guessedTooltipId ? 'default' : ''
	}

	private updateLobbyHoverAtPoint(id: string | null): void {
		if (!this.map) return

		const hoverableId = lobbyHoverableCountryId(
			id,
			this.lobbySelectedId,
			this.lobbyHintId
		)

		if (hoverableId === this.hoveredId) {
			this.map.getCanvas().style.cursor = id ? 'pointer' : ''
			return
		}

		this.clearHover()

		if (hoverableId) {
			this.hoveredId = hoverableId
			this.setFeatureVisual(hoverableId, 'hover')
			this.map.getCanvas().style.cursor = 'pointer'
			return
		}

		this.map.getCanvas().style.cursor = id ? 'pointer' : ''
	}

	private updateExploreHoverAtPoint(id: string | null): void {
		if (!this.map) return

		if (id === this.hoveredId) {
			this.map.getCanvas().style.cursor = id ? 'pointer' : ''
			return
		}

		this.clearHover()

		if (id) {
			this.hoveredId = id
			this.setFeatureVisual(id, 'hover')
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
		if (this.lobbyMode) {
			this.syncLobbyFeatureStates()
			return
		}

		if (this.exploreMode) {
			this.setFeatureVisual(id, 'default')
			return
		}

		this.setFeatureVisual(id, this.baseVisualFor(id))
	}

	private baseVisualFor(id: string) {
		return baseCountryVisual(id, this.snapshot)
	}

	private visualFor(id: string) {
		return countryVisual(id, this.snapshot, this.hoveredId)
	}

	private hasCountriesSource(): boolean {
		return !!this.map?.getSource(COUNTRIES_SOURCE_ID)
	}

	private waitForCountriesSourceData(): Promise<void> {
		if (!this.map || !this.hasCountriesSource()) return Promise.resolve()

		if (this.map.isSourceLoaded(COUNTRIES_SOURCE_ID)) {
			return Promise.resolve()
		}

		return new Promise((resolve) => {
			const map = this.map!
			const finish = () => {
				map.off('sourcedata', onSourceData)
				resolve()
			}
			const onSourceData = (event: maplibregl.MapSourceDataEvent) => {
				if (event.sourceId !== COUNTRIES_SOURCE_ID) return
				if (!map.isSourceLoaded(COUNTRIES_SOURCE_ID)) return
				finish()
			}
			map.on('sourcedata', onSourceData)
			window.setTimeout(finish, 3000)
		})
	}

	private applyEraFeatureStatesAfterSwap(): void {
		this.initDefaultFeatureStates()
		if (this.lobbyMode) this.syncLobbyFeatureStates()
		if (this.exploreMode) {
			this.syncExploreFeatureStates()
			this.syncExploreEraLabels()
		}
		if (this.snapshot) this.syncFeatureStates()
	}

	private setFeatureVisual(id: string, visual: EntityVisualState): void {
		if (!this.map || !this.hasCountriesSource()) return
		this.map.setFeatureState({ source: COUNTRIES_SOURCE_ID, id }, { visual })
	}

	private ensureGuessedTooltip(): maplibregl.Marker {
		if (!this.guessedTooltip) {
			const el = document.createElement('div')
			el.className =
				'pointer-events-none select-none whitespace-nowrap rounded-lg border border-success/60 bg-base-100/90 px-2 py-0.5 text-xs font-semibold text-base-content shadow-lg'
			this.guessedTooltipEl = el
			this.guessedTooltip = new maplibregl.Marker({
				element: el,
				anchor: 'bottom',
				offset: [0, -12]
			})
		}
		return this.guessedTooltip
	}

	private updateGuessedTooltip(id: string | null, point: maplibregl.PointLike): void {
		if (!this.map) return

		const tooltipId = resolveGuessedTooltipId(id, this.snapshot?.guessedIds ?? new Set())
		if (!tooltipId) {
			this.hideGuessedTooltip()
			return
		}

		const name = this.era?.getDisplayName(tooltipId, this.snapshot?.locale ?? 'en')
		if (!name) {
			this.hideGuessedTooltip()
			return
		}

		const marker = this.ensureGuessedTooltip()
		if (this.tooltipCountryId !== tooltipId && this.guessedTooltipEl) {
			this.guessedTooltipEl.textContent = name
			this.tooltipCountryId = tooltipId
		}
		marker.setLngLat(this.map.unproject(point))
		if (!this.tooltipVisible) {
			marker.addTo(this.map)
			this.tooltipVisible = true
		}
	}

	private hideGuessedTooltip(): void {
		if (!this.tooltipVisible && !this.tooltipCountryId) return
		this.tooltipCountryId = null
		this.tooltipVisible = false
		this.guessedTooltip?.remove()
	}
}
