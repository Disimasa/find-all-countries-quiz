<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte'
	import maplibregl from 'maplibre-gl'
	import MapboxDraw from 'maplibre-gl-draw'
	import 'maplibre-gl-draw/dist/mapbox-gl-draw.css'
	import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'
	import { bbox } from '@turf/turf'
	import { MAP_STYLE_URL } from '@infrastructure/map/constants'
	import {
		buildEraMapLabelLayerOptions,
		configureEditorBasemap,
		EDITOR_ERA_LABELS_LAYER_ID,
		EDITOR_ERA_LABELS_SOURCE_ID,
		setEditorBasemapCityVisibility
	} from '@infrastructure/map/explore_country_labels'
	import {
		fillEntityInDirection,
		FILL_DIRECTION_LABELS,
		type FillDirection
	} from '$lib/dev/boundary_editor/directional_fill'
	import { subtractAreaFromEntity } from '$lib/dev/boundary_editor/area_subtract'
	import {
		clearWaterObstacleCache,
		expandObstacleBounds,
		listWaterObstaclesFromMap,
		primeWaterObstacleCache
	} from '$lib/dev/boundary_editor/map_water_obstacles'
	import { GeometryHistory } from '$lib/dev/boundary_editor/editor_history'
	import { EditorDraftStore, geometriesEqual } from '$lib/dev/boundary_editor/editor_drafts'
	import { createDirectSelectBoxMode } from '$lib/dev/boundary_editor/direct_select_box_mode'
	import { attachMiddleMousePan, type MiddleMousePanControl } from '$lib/dev/boundary_editor/middle_mouse_pan'
	import { buildBoundaryEditorDrawStyles } from '$lib/dev/boundary_editor/draw_editor_styles'
	import { normalizeFilledGeometry, stripFillArtifactHoles } from '$lib/dev/boundary_editor/geometry_cleanup'
	import {
		clipPolygonToNeighbors,
		clampVertexToBorders,
		clampVerticesToBorders,
		editedPartIndicesFromCoordPaths,
		listEditorObstacles
	} from '$lib/dev/boundary_editor/geometry_constraints'
	import {
		buildEditorEraLabelsCollection,
		featureBounds,
		getAreaFeature,
		listEditorEntities,
		loadMergedCollection,
		fetchRevisionMeta,
		type EditorEntity,
		type RevisionLoad
	} from '$lib/dev/boundary_editor/era_loader'

	export let data: {
		eras: { id: string; year: number | null }[]
	}

	let mapContainer: HTMLDivElement
	let map: maplibregl.Map | null = null
	let middleMousePan: MiddleMousePanControl | null = null
	let draw: MapboxDraw | null = null
	let drawFeatureId: string | null = null

	let eraId = 'ce1300'
	let collection: FeatureCollection | null = null
	let entities: EditorEntity[] = []
	let selectedId: string | null = null
	let rusOnly = true
	let respectBorders = true
	let showCities = false
	let subtractMode = false
	let status = ''
	let saving = false
	let revisionIds: string[] = []
	let activeRevisionSource: RevisionLoad = 'latest'
	let resizeObserver: ResizeObserver | null = null
	let geometryHistory = new GeometryHistory()
	let editorDrafts = new EditorDraftStore()
	let unsavedDraftIds: string[] = []
	let lastGeometrySnapshot: Feature<Polygon | MultiPolygon> | null = null
	let suppressHistoryRecording = false
	let suppressDrawModeSync = false
	let lastDrawMode = 'simple_select'
	let onKeyDown: ((event: KeyboardEvent) => void) | null = null
	let dragBorderObstacles: ReturnType<typeof listEditorObstacles> = []

	function refreshDragBorderObstacles(): void {
		if (!respectBorders || !collection || !selectedId || !map) {
			dragBorderObstacles = []
			return
		}

		const edited = getEditedFeatureFromDraw()
		if (!edited) {
			dragBorderObstacles = listEditorObstacles(collection, selectedId, {
				map,
				includeWater: false
			})
			return
		}

		const bounds = bbox(edited) as [number, number, number, number]
		primeWaterObstacleCache(map, bounds)
		dragBorderObstacles = listEditorObstacles(collection, selectedId, {
			map,
			bounds,
			waterUseCache: true
		})
	}

	const vertexBorderClamp = {
		isEnabled: () => respectBorders,
		onDragStart: () => refreshDragBorderObstacles(),
		clampVertex: (from: Position, to: Position): Position => {
			if (!respectBorders || !collection || !selectedId) return to
			return clampVertexToBorders(from, to, dragBorderObstacles)
		},
		clampVertices: (moves: { from: Position; to: Position }[]): Position[] => {
			if (!respectBorders) return moves.map(({ to }) => to)
			return clampVerticesToBorders(moves, [])
		},
		clipAfterDrag: (editedCoordPaths: string[]): void => {
			if (!respectBorders || !collection || !selectedId) return
			const current = getEditedFeatureFromDraw()
			if (!current?.geometry) return

			clearWaterObstacleCache()
			const editedPartIndices = editedPartIndicesFromCoordPaths(
				editedCoordPaths,
				current.geometry
			)
			const geometry = current.geometry
			const clipBounds =
				editedPartIndices.length && geometry.type === 'MultiPolygon'
					? (bbox({
							type: 'Feature',
							properties: {},
							geometry: {
								type: 'MultiPolygon',
								coordinates: editedPartIndices.map((index) => geometry.coordinates[index])
							}
						}) as [number, number, number, number])
					: (bbox(current) as [number, number, number, number])

			const clipped = clipPolygonToNeighbors(current, collection, selectedId, {
				map,
				bounds: clipBounds,
				waterUseCache: false,
				waterMaxFeatures: 14,
				editedPartIndices: geometry.type === 'MultiPolygon' ? editedPartIndices : undefined
			})
			dragBorderObstacles = []
			if (geometriesEqual(current, clipped)) return
			replaceDrawFeature(clipped, { clean: false })
		}
	}

	const CONTEXT_SOURCE = 'editor-context'
	const CONTEXT_FILL = 'editor-context-fill'
	const CONTEXT_LINE = 'editor-context-line'
	let mapOverlayListenersBound = false

	function syncDraftMarkers(): void {
		unsavedDraftIds = editorDrafts.ids()
	}

	async function reloadEra(source: RevisionLoad = 'latest'): Promise<void> {
		status = 'Загрузка…'
		editorDrafts.clear()
		syncDraftMarkers()
		selectedId = null
		clearDraw()
		geometryHistory.clear()
		lastGeometrySnapshot = null

		const meta = await fetchRevisionMeta(eraId)
		revisionIds = meta.revisions
		activeRevisionSource = source

		const merged = await loadMergedCollection(eraId, source)
		collection = merged

		const rawEntities = (await fetch(`/data/eras/${eraId}/entities.json`).then((r) =>
			r.json()
		)) as EditorEntity[]

		entities = listEditorEntities(rawEntities, merged, rusOnly)
		syncMapOverlays(null)

		const sourceLabel =
			source === 'base'
				? 'boundaries.geojson (база)'
				: source === 'latest'
					? meta.latest
						? `последняя ревизия (${meta.latest})`
						: 'boundaries.geojson'
					: `ревизия ${source}`
		status = `Загружено ${merged.features.length} полигонов — ${sourceLabel}`
	}

	function applyShowCities(): void {
		if (!map) return
		runWhenMapStyleReady(() => {
			if (!map) return
			setEditorBasemapCityVisibility(map, showCities)
		})
	}

	function syncEditorBasemap(): void {
		if (!map) return
		runWhenMapStyleReady(() => {
			if (!map) return
			configureEditorBasemap(map, { showCities })
		})
	}

	function runWhenMapStyleReady(run: () => void): void {
		if (!map) return

		if (map.isStyleLoaded()) {
			run()
			return
		}

		map.once('idle', () => {
			if (map?.isStyleLoaded()) run()
		})
	}

	function handleContextFillClick(event: maplibregl.MapLayerMouseEvent): void {
		const entityId = event.features?.[0]?.properties?.entity_id
		if (typeof entityId !== 'string') return
		selectEntity(entityId)
	}

	function handleContextFillSubtractMousedown(event: maplibregl.MapLayerMouseEvent): void {
		if (!subtractMode || !selectedId) return

		const entityId = event.features?.[0]?.properties?.entity_id
		if (typeof entityId !== 'string') return
		if (entityId === selectedId) return

		event.preventDefault()
		event.originalEvent.stopPropagation()
		subtractEntityArea(entityId)
	}

	function bindMapOverlayListeners(): void {
		if (!map || mapOverlayListenersBound) return
		mapOverlayListenersBound = true

		map.on('mousedown', CONTEXT_FILL, handleContextFillSubtractMousedown)
		map.on('click', CONTEXT_FILL, (event) => {
			if (subtractMode) return
			handleContextFillClick(event)
		})

		map.on('mouseenter', CONTEXT_FILL, () => {
			map!.getCanvas().style.cursor = subtractMode ? 'crosshair' : 'pointer'
		})
		map.on('mouseleave', CONTEXT_FILL, () => {
			map!.getCanvas().style.cursor = ''
		})
	}

	function syncMapOverlays(excludeEntityId?: string | null): void {
		if (!map || !collection) return

		runWhenMapStyleReady(() => {
			if (!map || !collection) return
			updateContextLayer(collection, excludeEntityId)
			updateEraLabels()
			bindMapOverlayListeners()
		})
	}

	function updateEraLabels(): void {
		if (!map || !collection) return

		const data = buildEditorEraLabelsCollection(collection, entities)
		const source = map.getSource(EDITOR_ERA_LABELS_SOURCE_ID) as
			| maplibregl.GeoJSONSource
			| undefined

		if (source) {
			source.setData(data)
			if (map.getLayer(EDITOR_ERA_LABELS_LAYER_ID)) {
				map.moveLayer(EDITOR_ERA_LABELS_LAYER_ID)
			}
			return
		}

		const labelLayer = buildEraMapLabelLayerOptions()
		map.addSource(EDITOR_ERA_LABELS_SOURCE_ID, { type: 'geojson', data })
		map.addLayer({
			id: EDITOR_ERA_LABELS_LAYER_ID,
			type: 'symbol',
			source: EDITOR_ERA_LABELS_SOURCE_ID,
			layout: labelLayer.layout,
			paint: labelLayer.paint
		})
		map.moveLayer(EDITOR_ERA_LABELS_LAYER_ID)
	}

	function firstDrawLayerId(): string | undefined {
		if (!map) return undefined
		return map.getStyle().layers?.find((layer) => layer.id.startsWith('gl-draw-'))?.id
	}

	function updateContextLayer(geoJson: FeatureCollection, excludeEntityId?: string | null): void {
		if (!map) return
		const data =
			excludeEntityId != null
				? {
						...geoJson,
						features: geoJson.features.filter(
							(feature) => feature.properties?.entity_id !== excludeEntityId
						)
					}
				: geoJson
		const source = map.getSource(CONTEXT_SOURCE) as maplibregl.GeoJSONSource | undefined
		if (source) {
			source.setData(data)
			return
		}

		map.addSource(CONTEXT_SOURCE, { type: 'geojson', data })
		const beforeDraw = firstDrawLayerId()
		map.addLayer(
			{
				id: CONTEXT_FILL,
				type: 'fill',
				source: CONTEXT_SOURCE,
				paint: {
					'fill-color': '#c4b5fd',
					'fill-opacity': 0.25
				}
			},
			beforeDraw
		)
		map.addLayer(
			{
				id: CONTEXT_LINE,
				type: 'line',
				source: CONTEXT_SOURCE,
				paint: {
					'line-color': '#6d5cc0',
					'line-width': 1
				}
			},
			beforeDraw
		)
	}

	function clearDraw(): void {
		if (!draw) return
		draw.deleteAll()
		drawFeatureId = null
	}

	function ensureDirectSelectMode(): void {
		if (!draw || !drawFeatureId || !selectedId) return
		if (!draw.get(drawFeatureId)) return
		if (draw.getMode() === 'direct_select') {
			lastDrawMode = 'direct_select'
			return
		}

		suppressDrawModeSync = true
		try {
			draw.changeMode('direct_select', { featureId: drawFeatureId })
			lastDrawMode = 'direct_select'
		} finally {
			queueMicrotask(() => {
				suppressDrawModeSync = false
			})
		}
	}

	function deselectEntity(): void {
		if (!selectedId) return

		commitCurrentDraft()
		selectedId = null
		subtractMode = false
		geometryHistory.clear()
		lastGeometrySnapshot = null

		suppressDrawModeSync = true
		try {
			clearDraw()
		} finally {
			suppressDrawModeSync = false
		}

		if (collection) {
			updateContextLayer(collection, null)
			updateEraLabels()
		}

		status = 'Страна не выбрана'
	}

	function onDrawModeChange(event: { mode: string }): void {
		const previousMode = lastDrawMode
		lastDrawMode = event.mode
		if (suppressDrawModeSync) return
		if (previousMode === 'direct_select' && event.mode === 'simple_select' && selectedId) {
			if (subtractMode) {
				queueMicrotask(() => ensureDirectSelectMode())
				return
			}
			deselectEntity()
		}
	}

	function syncGeometrySnapshot(): void {
		lastGeometrySnapshot = getEditedFeatureFromDraw()
	}

	function pushUndoSnapshot(): void {
		if (suppressHistoryRecording) return
		geometryHistory.push(lastGeometrySnapshot)
	}

	function cleanDrawGeometry(
		feature: Feature<Polygon | MultiPolygon>
	): Feature<Polygon | MultiPolygon> {
		if (!collection || !selectedId) return normalizeFilledGeometry(feature)

		const baseline = getAreaFeature(collection, selectedId)
		if (!baseline) return normalizeFilledGeometry(feature)

		return stripFillArtifactHoles(normalizeFilledGeometry(feature), baseline)
	}

	function replaceDrawFeature(
		feature: Feature<Polygon | MultiPolygon>,
		options: { clean?: boolean; preserveHoles?: boolean } = {}
	): void {
		if (!draw) return

		const normalized =
			options.clean === false || options.preserveHoles
				? normalizeFilledGeometry(feature)
				: cleanDrawGeometry(feature)

		suppressHistoryRecording = true
		suppressDrawModeSync = true
		try {
			draw.deleteAll()
			const ids = draw.add(normalized)
			const idList = (Array.isArray(ids) ? ids : [ids]).map(String)
			drawFeatureId = idList[0] ?? null
			if (drawFeatureId) {
				draw.changeMode('direct_select', { featureId: drawFeatureId })
				lastDrawMode = 'direct_select'
			}
		} finally {
			queueMicrotask(() => {
				suppressHistoryRecording = false
				suppressDrawModeSync = false
				ensureDirectSelectMode()
				syncGeometrySnapshot()
			})
		}
	}

	function undoLastAction(): void {
		const previous = geometryHistory.pop()
		if (!previous) {
			status = 'Нечего отменять'
			return
		}

		replaceDrawFeature(previous, { clean: false })
		lastGeometrySnapshot = previous
		status = 'Отменено'
	}

	function onDrawGeometryChanged(): void {
		if (suppressHistoryRecording || !selectedId) return

		const current = getEditedFeatureFromDraw()
		if (!current) return

		geometryHistory.push(lastGeometrySnapshot)
		lastGeometrySnapshot = current
	}

	function getEditedFeatureFromDraw(): Feature<Polygon | MultiPolygon> | null {
		if (!draw || !collection || !selectedId) return null

		const parts = draw.getAll().features.filter(
			(feature) =>
				feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
		)
		if (!parts.length) return null

		const baseProps = getAreaFeature(collection, selectedId)?.properties ?? {}
		const properties = {
			...baseProps,
			entity_id: selectedId,
			name_en: baseProps.name_en ?? selectedId
		}

		if (parts.length === 1 && parts[0].geometry?.type === 'Polygon') {
			return {
				...parts[0],
				properties: { ...properties, ...parts[0].properties },
				geometry: parts[0].geometry
			} as Feature<Polygon>
		}

		const polygons: MultiPolygon['coordinates'] = []
		for (const part of parts) {
			if (!part.geometry) continue
			if (part.geometry.type === 'Polygon') {
				polygons.push(part.geometry.coordinates)
				continue
			}
			if (part.geometry.type === 'MultiPolygon') {
				polygons.push(...part.geometry.coordinates)
			}
		}

		if (!polygons.length) return null

		return {
			type: 'Feature',
			properties,
			geometry: { type: 'MultiPolygon', coordinates: polygons }
		}
	}

	function commitCurrentDraft(): void {
		if (!collection || !selectedId) return

		const edited = getEditedFeatureFromDraw()
		if (!edited) return

		collection = editorDrafts.commit(selectedId, edited, collection)
		syncDraftMarkers()
	}

	function selectEntity(entityId: string): void {
		if (!map || !draw || !collection) return
		if (entityId === selectedId) {
			ensureDirectSelectMode()
			if (draw.getMode() === 'direct_select') return
			status = `Редактирование: ${entityId}`
			return
		}

		commitCurrentDraft()

		const feature = getAreaFeature(collection, entityId)
		if (!feature) {
			status = `Нет геометрии для ${entityId}`
			return
		}

		suppressDrawModeSync = true
		try {
			clearDraw()
			geometryHistory.clear()
			selectedId = entityId
			subtractMode = false

			const ids = draw.add(feature)
			const id = String(Array.isArray(ids) ? ids[0] : ids)
			drawFeatureId = id
			draw.changeMode('direct_select', { featureId: id })
			lastDrawMode = 'direct_select'
		} finally {
			queueMicrotask(() => {
				suppressDrawModeSync = false
				ensureDirectSelectMode()
			})
		}

		const bounds = featureBounds(feature)
		map.fitBounds(
			[
				[bounds[0], bounds[1]],
				[bounds[2], bounds[3]]
			],
			{ padding: 80, duration: 600, maxZoom: 6 }
		)

		updateContextLayer(collection, entityId)
		updateEraLabels()
		syncGeometrySnapshot()

		status = `Редактирование: ${entityId}`
	}

	function previewFill(direction: FillDirection): void {
		if (!collection || !selectedId) return

		const raw = getEditedFeatureFromDraw()
		if (!raw) {
			status = 'Нет геометрии для заполнения'
			return
		}

		pushUndoSnapshot()

		let edited = cleanDrawGeometry(raw)
		if (!geometriesEqual(raw, edited)) {
			replaceDrawFeature(edited)
			edited = getEditedFeatureFromDraw() ?? edited
		}

		const waterObstacles =
			map != null
				? listWaterObstaclesFromMap(
						map,
						expandObstacleBounds(bbox(edited) as [number, number, number, number]),
						{ useCache: false, maxFeatures: 14 }
					)
				: []

		const result = fillEntityInDirection(
			edited,
			collection,
			selectedId,
			direction,
			waterObstacles
		)
		replaceDrawFeature(result.feature)

		const label = FILL_DIRECTION_LABELS[direction]
		status = result.expanded
			? `Заполнение (${label}): площадь ×${(result.areaAfterSqM / result.areaBeforeSqM).toFixed(2)}`
			: `Заполнение (${label}): некуда расширяться — уже упёрлось в соседей`
	}

	function toggleSubtractMode(): void {
		subtractMode = !subtractMode
		if (subtractMode) ensureDirectSelectMode()
		status = subtractMode
			? 'Режим вычитания: кликните область на карте'
			: 'Режим вычитания выключен'
	}

	function subtractEntityArea(subtractorId: string): void {
		if (!collection || !selectedId) return

		const subtractor = getAreaFeature(collection, subtractorId)
		if (!subtractor) {
			status = `Нет геометрии для вычитания: ${subtractorId}`
			return
		}

		const raw = getEditedFeatureFromDraw()
		if (!raw) {
			status = 'Нет геометрии для редактирования'
			return
		}

		pushUndoSnapshot()

		let target = cleanDrawGeometry(raw)
		if (!geometriesEqual(raw, target)) {
			replaceDrawFeature(target)
			target = getEditedFeatureFromDraw() ?? target
		}

		const result = subtractAreaFromEntity(target, subtractor)
		if (!result.changed) {
			status = `Вычитание (${subtractorId}): нет пересечения с текущей областью`
			return
		}

		replaceDrawFeature(result.feature, { preserveHoles: true })
		status = `Вычитание (−${subtractorId}): площадь ×${(result.areaAfterSqM / result.areaBeforeSqM).toFixed(2)}`
	}

	async function saveRevision(): Promise<void> {
		if (!collection) return

		commitCurrentDraft()

		saving = true
		status = 'Сохранение…'

		try {
			const response = await fetch('/dev/boundaries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eraId, collection })
			})

			if (!response.ok) {
				const text = await response.text()
				throw new Error(text || `HTTP ${response.status}`)
			}

			const result = (await response.json()) as { revisionId: string; path: string }
			activeRevisionSource = result.revisionId
			revisionIds = [...revisionIds, result.revisionId]
			editorDrafts.clear()
			syncDraftMarkers()

			status = `Сохранено: ${result.path}`
		} catch (error) {
			status = error instanceof Error ? error.message : 'Ошибка сохранения'
		} finally {
			saving = false
		}
	}

	function applyRusFilter(): void {
		if (!collection) return
		void fetch(`/data/eras/${eraId}/entities.json`)
			.then((r) => r.json())
			.then((raw: EditorEntity[]) => {
				entities = listEditorEntities(raw, collection!, rusOnly)
				syncMapOverlays(selectedId)
			})
	}

	function revisionSelectValue(): string {
		if (activeRevisionSource === 'base') return '__base__'
		if (activeRevisionSource === 'latest') return '__latest__'
		return activeRevisionSource
	}

	function onRevisionChange(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement
		const value = select.value
		if (value === '__base__') {
			void reloadEra('base')
			return
		}
		if (value === '__latest__') {
			void reloadEra('latest')
			return
		}
		void reloadEra(value)
	}

	onMount(() => {
		void (async () => {
			const params = new URLSearchParams(window.location.search)
			eraId = params.get('era') ?? data.eras[0]?.id ?? 'ce1300'

			// maplibre-gl-draw expects mapbox-gl on window
			;(window as Window & { mapboxgl?: typeof maplibregl }).mapboxgl = maplibregl

			await tick()

			map = new maplibregl.Map({
				container: mapContainer,
				style: MAP_STYLE_URL,
				center: [35, 55],
				zoom: 3.5,
				maxZoom: 12,
				boxZoom: false
			})

			map.on('error', (event) => {
				status = `Ошибка карты: ${event.error?.message ?? 'unknown'}`
			})

			resizeObserver = new ResizeObserver(() => {
				map?.resize()
			})
			resizeObserver.observe(mapContainer)

			map.once('style.load', () => {
				syncEditorBasemap()
				syncMapOverlays(selectedId)
			})

			map.on('load', () => {
				map?.resize()
				syncEditorBasemap()
				middleMousePan = attachMiddleMousePan(map!)

				draw = new MapboxDraw({
					displayControlsDefault: false,
					boxSelect: false,
					styles: buildBoundaryEditorDrawStyles(),
					controls: {
						trash: true
					},
					defaultMode: 'simple_select',
					modes: {
						...MapboxDraw.modes,
						direct_select: createDirectSelectBoxMode(
							MapboxDraw.modes.direct_select,
							vertexBorderClamp
						)
					}
				})

				map?.addControl(draw as unknown as maplibregl.IControl, 'top-right')
				map?.addControl(new maplibregl.NavigationControl(), 'top-right')

				map?.on('draw.update', onDrawGeometryChanged)
				map?.on('draw.delete', onDrawGeometryChanged)
				map?.on('draw.modechange', onDrawModeChange)

				void reloadEra()
			})

			onKeyDown = (event: KeyboardEvent) => {
				const target = event.target
				if (
					target instanceof HTMLInputElement ||
					target instanceof HTMLTextAreaElement ||
					target instanceof HTMLSelectElement
				) {
					return
				}

				if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey) {
					event.preventDefault()
					event.stopPropagation()
					undoLastAction()
					return
				}

				if (event.code === 'Escape' && subtractMode) {
					event.preventDefault()
					subtractMode = false
					status = 'Режим вычитания выключен'
				}
			}
			window.addEventListener('keydown', onKeyDown, { capture: true })
		})()
	})

	onDestroy(() => {
		if (onKeyDown) {
			window.removeEventListener('keydown', onKeyDown, { capture: true })
			onKeyDown = null
		}
		middleMousePan?.destroy()
		middleMousePan = null
		resizeObserver?.disconnect()
		resizeObserver = null
		map?.remove()
		map = null
		draw = null
	})
</script>

<div class="pointer-events-auto flex h-full min-h-0 flex-col bg-base-200">
	<header class="flex flex-wrap items-center gap-3 border-b border-base-300 bg-base-100 px-4 py-3">
		<a href="/" class="text-sm text-base-content/70 hover:underline">← Квиз</a>
		<h1 class="text-lg font-semibold">Редактор границ (dev)</h1>

		<label class="flex items-center gap-2 text-sm">
			<span>Эпоха</span>
			<select class="select select-bordered select-sm" bind:value={eraId} on:change={() => reloadEra()}>
				{#each data.eras as era}
					<option value={era.id}>{era.id}{era.year ? ` (${era.year})` : ''}</option>
				{/each}
			</select>
		</label>

		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" class="checkbox checkbox-sm" bind:checked={rusOnly} on:change={applyRusFilter} />
			Только Русь
		</label>

		<label class="flex items-center gap-2 text-sm">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				bind:checked={showCities}
				on:change={applyShowCities}
			/>
			Города
		</label>

		<label
			class="flex items-center gap-2 text-sm"
			title="Одна точка — упор в границу страны или моря/океана; несколько — свободный перенос участка, выравнивание на отпускании"
		>
			<input type="checkbox" class="checkbox checkbox-sm" bind:checked={respectBorders} />
			Удерживать границы
		</label>

		<div class="flex items-center gap-1">
			<span class="text-sm">Заполнить</span>
			<button
				class="btn btn-outline btn-sm btn-square"
				title="На север"
				disabled={!selectedId || saving}
				on:click={() => previewFill('north')}
			>
				↑
			</button>
			<button
				class="btn btn-outline btn-sm btn-square"
				title="На юг"
				disabled={!selectedId || saving}
				on:click={() => previewFill('south')}
			>
				↓
			</button>
			<button
				class="btn btn-outline btn-sm btn-square"
				title="На запад"
				disabled={!selectedId || saving}
				on:click={() => previewFill('west')}
			>
				←
			</button>
			<button
				class="btn btn-outline btn-sm btn-square"
				title="На восток"
				disabled={!selectedId || saving}
				on:click={() => previewFill('east')}
			>
				→
			</button>
		</div>

		<button
			class="btn btn-outline btn-sm"
			class:btn-active={subtractMode}
			title="Клик по области на карте вычитает её из редактируемой"
			disabled={!selectedId || saving}
			on:click={toggleSubtractMode}
		>
			Вычесть область
		</button>

		<button
			class="btn btn-primary btn-sm"
			disabled={!collection || saving}
			on:click={() => saveRevision()}
		>
			{saving ? 'Сохранение…' : 'Сохранить ревизию'}
		</button>
		<label class="flex items-center gap-2 text-sm">
			<span>Ревизия</span>
			<select
				class="select select-bordered select-sm max-w-56"
				value={revisionSelectValue()}
				on:change={onRevisionChange}
			>
				<option value="__latest__">последняя ревизия</option>
				<option value="__base__">boundaries.geojson (база)</option>
				{#each revisionIds as revisionId}
					<option value={revisionId}>{revisionId}</option>
				{/each}
			</select>
		</label>
	</header>

	<div class="flex min-h-0 flex-1">
		<aside class="w-72 shrink-0 overflow-y-auto border-r border-base-300 bg-base-100 p-2">
			<p class="mb-2 px-2 text-xs text-base-content/60">
				Ревизии → <code class="text-xs">static/data/eras/{eraId}/revisions/</code>
			</p>
			<ul class="menu menu-sm gap-0.5">
				{#each entities as entity (entity.id)}
					<li>
						<button
							type="button"
							class:menu-active={selectedId === entity.id}
							on:click={() => selectEntity(entity.id)}
						>
							<span class="truncate">{entity.nameRu || entity.nameEn}</span>
							{#if unsavedDraftIds.includes(entity.id)}
								<span class="badge badge-warning badge-xs">draft</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</aside>

		<div class="boundary-editor-map relative min-h-0 flex-1 overflow-hidden">
			<div bind:this={mapContainer} class="absolute inset-0 size-full"></div>
		</div>
	</div>

	<footer class="border-t border-base-300 bg-base-100 px-4 py-2 text-sm text-base-content/80">
		{status}
		<span class="text-base-content/50">
			· Ctrl+Z — отмена · Shift+рамка — выбор точек · несколько точек + перетаскивание — натянуть участок границы в зазор
			· «Вычесть область» — клик по соседу
		</span>
	</footer>
</div>

<style>
	.boundary-editor-map :global(.maplibregl-map),
	.boundary-editor-map :global(.maplibregl-canvas) {
		width: 100%;
		height: 100%;
	}

	:global(.mapbox-gl-draw_ctrl-draw-btn) {
		background-color: #faf9f7;
	}
</style>
