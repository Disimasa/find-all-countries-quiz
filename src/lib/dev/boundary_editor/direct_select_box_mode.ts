import type MapboxDraw from 'maplibre-gl-draw'
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl'
import type { MultiPolygon, Polygon, Position } from 'geojson'

const BOX_SELECT_CLASS = 'mapbox-gl-draw_boxselect'
const MIN_BOX_PX = 4

export type VertexBorderClamp = {
	isEnabled: () => boolean
	onDragStart?: () => void
	clampVertex: (from: Position, to: Position) => Position
	clampVertices?: (moves: { from: Position; to: Position }[]) => Position[]
	clipAfterDrag?: (editedCoordPaths: string[]) => void
}

type AreaGeometry = Polygon | MultiPolygon

type MapPanSnapshot = {
	dragPanWasEnabled?: boolean
	boxZoomWasEnabled?: boolean
}

type BoxSelectState = {
	boxSelectStart: { x: number; y: number } | null
	canBoxSelect: boolean
	boxSelecting: boolean
	boxSelectElement: HTMLDivElement | null
	mapPanSnapshot?: MapPanSnapshot
	releaseShiftPanCapture?: () => void
	featureId: string
	selectedCoordPaths: string[]
	borderDragLastCoords?: Record<string, Position>
}

type DrawEvent = MapMouseEvent & {
	featureTarget?: { properties?: { meta?: string; active?: string } }
	originalEvent: MouseEvent
}

type DirectSelectModeThis = MapboxDraw.DrawCustomModeThis & {
	map: MaplibreMap
	getFeature: (id: string) => { toGeoJSON: () => { geometry?: { type: string } }; changed?: () => void }
	setSelectedCoordinates: (coords: { feature_id: string; coord_path: string }[]) => void
	pathsToCoordinates: (
		featureId: string,
		paths: string[]
	) => { feature_id: string; coord_path: string }[]
	fireActionable: (state: BoxSelectState) => void
	stopDragging: (state: BoxSelectState) => void
}

export type ProjectFn = (lngLat: [number, number]) => { x: number; y: number }

function mouseEventPoint(event: MouseEvent, container: HTMLElement): { x: number; y: number } {
	const rect = container.getBoundingClientRect()
	return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function isShiftDown(event: DrawEvent): boolean {
	return event.originalEvent.shiftKey
}

function isShiftMousedown(event: DrawEvent): boolean {
	return event.originalEvent.shiftKey && event.originalEvent.button === 0
}

function isVertex(event: DrawEvent): boolean {
	return event.featureTarget?.properties?.meta === 'vertex'
}

function isMidpoint(event: DrawEvent): boolean {
	return event.featureTarget?.properties?.meta === 'midpoint'
}

function openRing(ring: Position[]): Position[] {
	if (ring.length < 2) return ring
	const first = ring[0]
	const last = ring[ring.length - 1]
	if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1)
	return ring
}

export function forEachVertexPath(
	geometry: AreaGeometry,
	visit: (path: string, coordinate: Position) => void
): void {
	if (geometry.type === 'Polygon') {
		geometry.coordinates.forEach((ring, ringIndex) => {
			openRing(ring).forEach((coordinate, vertexIndex) => {
				visit(`${ringIndex}.${vertexIndex}`, coordinate)
			})
		})
		return
	}

	geometry.coordinates.forEach((part, partIndex) => {
		part.forEach((ring, ringIndex) => {
			openRing(ring).forEach((coordinate, vertexIndex) => {
				visit(`${partIndex}.${ringIndex}.${vertexIndex}`, coordinate)
			})
		})
	})
}

export function coordPathsInPixelBox(
	geometry: AreaGeometry,
	project: ProjectFn,
	minX: number,
	minY: number,
	maxX: number,
	maxY: number
): string[] {
	const paths: string[] = []

	forEachVertexPath(geometry, (path, coordinate) => {
		const { x, y } = project([coordinate[0], coordinate[1]])
		if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
			paths.push(path)
		}
	})

	return paths
}

function restoreBoxZoom(map: MaplibreMap, wasEnabled?: boolean): void {
	if (wasEnabled) map.boxZoom?.enable?.()
}

export function suspendMapPanForShiftSelect(map: MaplibreMap, snapshot: MapPanSnapshot): void {
	if (snapshot.dragPanWasEnabled === undefined) {
		snapshot.dragPanWasEnabled = map.dragPan.isEnabled()
		snapshot.boxZoomWasEnabled = map.boxZoom.isEnabled()
	}
	map.dragPan.disable()
	map.boxZoom?.disable?.()
}

export function restoreMapPan(map: MaplibreMap, snapshot: MapPanSnapshot): void {
	if (snapshot.dragPanWasEnabled) map.dragPan.enable()
	restoreBoxZoom(map, snapshot.boxZoomWasEnabled)
	snapshot.dragPanWasEnabled = undefined
	snapshot.boxZoomWasEnabled = undefined
}

function installShiftPanGuard(map: MaplibreMap, state: BoxSelectState): void {
	const canvas = map.getCanvas()

	const preemptPan = (event: MouseEvent): void => {
		if (event.button !== 0 || !event.shiftKey) return
		suspendMapPanForShiftSelect(map, state.mapPanSnapshot ??= {})
	}

	const releaseIfAborted = (event: MouseEvent): void => {
		if (event.button !== 0) return
		if (state.canBoxSelect || state.boxSelecting) return
		if (state.mapPanSnapshot?.dragPanWasEnabled !== undefined) {
			restoreMapPan(map, state.mapPanSnapshot)
		}
	}

	canvas.addEventListener('mousedown', preemptPan, { capture: true })
	window.addEventListener('mouseup', releaseIfAborted)

	state.releaseShiftPanCapture = () => {
		canvas.removeEventListener('mousedown', preemptPan, { capture: true })
		window.removeEventListener('mouseup', releaseIfAborted)
		if (state.mapPanSnapshot) restoreMapPan(map, state.mapPanSnapshot)
	}
}

function cleanupBoxSelect(state: BoxSelectState): void {
	if (state.boxSelectElement?.parentNode) {
		state.boxSelectElement.parentNode.removeChild(state.boxSelectElement)
	}
	state.boxSelectElement = null
	state.boxSelectStart = null
	state.canBoxSelect = false
	state.boxSelecting = false
}

function startBoxSelect(this: DirectSelectModeThis, state: BoxSelectState, event: DrawEvent): void {
	this.stopDragging(state)
	event.originalEvent.preventDefault()
	event.originalEvent.stopPropagation()
	suspendMapPanForShiftSelect(this.map, state.mapPanSnapshot ??= {})
	state.boxSelectStart = mouseEventPoint(event.originalEvent, this.map.getContainer())
	state.canBoxSelect = true
}

function whileBoxSelect(this: DirectSelectModeThis, state: BoxSelectState, event: DrawEvent): void {
	if (!state.boxSelectStart) return

	event.originalEvent.preventDefault()
	event.originalEvent.stopPropagation()
	state.boxSelecting = true

	if (!state.boxSelectElement) {
		state.boxSelectElement = document.createElement('div')
		state.boxSelectElement.classList.add(BOX_SELECT_CLASS)
		this.map.getContainer().appendChild(state.boxSelectElement)
	}

	const current = mouseEventPoint(event.originalEvent, this.map.getContainer())
	const minX = Math.min(state.boxSelectStart.x, current.x)
	const maxX = Math.max(state.boxSelectStart.x, current.x)
	const minY = Math.min(state.boxSelectStart.y, current.y)
	const maxY = Math.max(state.boxSelectStart.y, current.y)
	const transform = `translate(${minX}px, ${minY}px)`

	state.boxSelectElement.style.transform = transform
	state.boxSelectElement.style.width = `${maxX - minX}px`
	state.boxSelectElement.style.height = `${maxY - minY}px`
}

function finishBoxSelect(this: DirectSelectModeThis, state: BoxSelectState, event: DrawEvent): void {
	if (!state.boxSelectStart) return

	const end = mouseEventPoint(event.originalEvent, this.map.getContainer())
	const minX = Math.min(state.boxSelectStart.x, end.x)
	const maxX = Math.max(state.boxSelectStart.x, end.x)
	const minY = Math.min(state.boxSelectStart.y, end.y)
	const maxY = Math.max(state.boxSelectStart.y, end.y)

	if (maxX - minX >= MIN_BOX_PX && maxY - minY >= MIN_BOX_PX) {
		const feature = this.getFeature(state.featureId)
		const geometry = feature?.toGeoJSON?.().geometry
		if (geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon') {
			const paths = coordPathsInPixelBox(
				geometry as AreaGeometry,
				(lngLat) => this.map.project(lngLat),
				minX,
				minY,
				maxX,
				maxY
			)

			if (isShiftDown(event)) {
				for (const path of paths) {
					if (!state.selectedCoordPaths.includes(path)) {
						state.selectedCoordPaths.push(path)
					}
				}
			} else {
				state.selectedCoordPaths = paths
			}

			this.setSelectedCoordinates(this.pathsToCoordinates(state.featureId, state.selectedCoordPaths))
			feature?.changed?.()
			this.fireActionable(state)
		}
	}

	if (state.mapPanSnapshot) {
		restoreMapPan(this.map, state.mapPanSnapshot)
	}
	cleanupBoxSelect(state)
}

function applyVertexBorderClamp(
	this: DirectSelectModeThis,
	state: BoxSelectState,
	borderClamp?: VertexBorderClamp
): void {
	if (!borderClamp?.isEnabled()) return

	const feature = this.getFeature(state.featureId)
	if (!feature?.getCoordinate || !feature.updateCoordinate) return

	if (!state.borderDragLastCoords) state.borderDragLastCoords = {}

	const paths = state.selectedCoordPaths
	if (paths.length > 1 && borderClamp.clampVertices) {
		const moves = paths.map((path) => {
			const current = feature.getCoordinate(path)
			return {
				from: state.borderDragLastCoords![path] ?? current,
				to: current
			}
		})
		const clamped = borderClamp.clampVertices(moves)
		paths.forEach((path, index) => {
			const pos = clamped[index]
			state.borderDragLastCoords![path] = pos
			const current = moves[index].to
			if (pos[0] !== current[0] || pos[1] !== current[1]) {
				feature.updateCoordinate(path, pos[0], pos[1])
			}
		})
	} else {
		for (const path of paths) {
			const current = feature.getCoordinate(path)
			const from = state.borderDragLastCoords[path] ?? current
			const clamped = borderClamp.clampVertex(from, current)
			state.borderDragLastCoords[path] = clamped
			if (clamped[0] !== current[0] || clamped[1] !== current[1]) {
				feature.updateCoordinate(path, clamped[0], clamped[1])
			}
		}
	}

	feature.changed?.()
}

function seedBorderDragCoords(this: DirectSelectModeThis, state: BoxSelectState): void {
	const feature = this.getFeature(state.featureId)
	if (!feature?.getCoordinate) return

	state.borderDragLastCoords = {}
	for (const path of state.selectedCoordPaths) {
		state.borderDragLastCoords[path] = feature.getCoordinate(path)
	}
}

function clearBorderDragCoords(state: BoxSelectState): void {
	state.borderDragLastCoords = undefined
}

/** direct_select + Shift+drag box to select multiple vertices. */
export function createDirectSelectBoxMode(
	base: MapboxDraw.DrawCustomMode<BoxSelectState>,
	borderClamp?: VertexBorderClamp
): MapboxDraw.DrawCustomMode<BoxSelectState> {
	return {
		...base,
		onSetup(opts) {
			const state = base.onSetup?.call(this, opts) as BoxSelectState
			const nextState: BoxSelectState = {
				...state,
				boxSelectStart: null,
				canBoxSelect: false,
				boxSelecting: false,
				boxSelectElement: null,
				mapPanSnapshot: undefined,
				borderDragLastCoords: undefined
			}
			installShiftPanGuard(this.map, nextState)
			return nextState
		},
		onStop(state) {
			state.releaseShiftPanCapture?.()
			state.releaseShiftPanCapture = undefined
			cleanupBoxSelect(state)
			clearBorderDragCoords(state)
			base.onStop?.call(this, state)
		},
		onMouseDown(state, event) {
			const drawEvent = event as DrawEvent
			if (isVertex(drawEvent) || isMidpoint(drawEvent)) {
				base.onMouseDown?.call(this, state, event)
				if (borderClamp?.isEnabled()) {
					borderClamp.onDragStart?.()
					seedBorderDragCoords.call(this as DirectSelectModeThis, state)
				}
				return
			}
			if (isShiftMousedown(drawEvent)) {
				startBoxSelect.call(this as DirectSelectModeThis, state, drawEvent)
				return
			}
			return base.onMouseDown?.call(this, state, event)
		},
		onClick(state, event) {
			if (state.canBoxSelect || state.boxSelecting) {
				finishBoxSelect.call(this as DirectSelectModeThis, state, event as DrawEvent)
				return
			}
			return base.onClick?.call(this, state, event)
		},
		onMouseMove(state, event) {
			if (state.canBoxSelect || state.boxSelecting) {
				return true
			}
			return base.onMouseMove?.call(this, state, event)
		},
		onDrag(state, event) {
			if (state.canBoxSelect) {
				whileBoxSelect.call(this as DirectSelectModeThis, state, event as DrawEvent)
				return
			}
			base.onDrag?.call(this, state, event)
			applyVertexBorderClamp.call(this as DirectSelectModeThis, state, borderClamp)
		},
		onTouchMove(state, event) {
			if (state.canBoxSelect || state.boxSelecting) {
				return true
			}
			base.onTouchMove?.call(this, state, event)
			applyVertexBorderClamp.call(this as DirectSelectModeThis, state, borderClamp)
		},
		onMouseUp(state, event) {
			if (state.boxSelecting || state.canBoxSelect) {
				finishBoxSelect.call(this as DirectSelectModeThis, state, event as DrawEvent)
				return
			}
			const hadBorderDrag = Boolean(state.borderDragLastCoords && borderClamp?.isEnabled())
			const editedCoordPaths = state.borderDragLastCoords
				? Object.keys(state.borderDragLastCoords)
				: []
			clearBorderDragCoords(state)
			const result = base.onMouseUp?.call(this, state, event)
			if (hadBorderDrag) borderClamp?.clipAfterDrag?.(editedCoordPaths)
			return result
		},
		onTouchEnd(state, event) {
			if (state.boxSelecting || state.canBoxSelect) {
				finishBoxSelect.call(this as DirectSelectModeThis, state, event as unknown as DrawEvent)
				return
			}
			const hadBorderDrag = Boolean(state.borderDragLastCoords && borderClamp?.isEnabled())
			const editedCoordPaths = state.borderDragLastCoords
				? Object.keys(state.borderDragLastCoords)
				: []
			clearBorderDragCoords(state)
			const result = base.onTouchEnd?.call(this, state, event)
			if (hadBorderDrag) borderClamp?.clipAfterDrag?.(editedCoordPaths)
			return result
		}
	}
}
