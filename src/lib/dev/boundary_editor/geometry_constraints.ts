import {
	area,
	bbox,
	booleanIntersects,
	booleanPointInPolygon,
	difference,
	featureCollection,
	intersect,
	type Feature,
	type FeatureCollection,
	type MultiPolygon,
	type Polygon,
	type Position
} from '@turf/turf'
import { boundsIntersect } from './directional_fill.ts'
import { reconcileClippedGeometry, simplifyCoastClipRings, unionAreaFeatures } from './geometry_cleanup.ts'
import {
	expandObstacleBounds,
	listWaterObstaclesFromMap
} from './map_water_obstacles.ts'
import type { Map as MaplibreMap } from 'maplibre-gl'

export type AreaFeature = Feature<Polygon | MultiPolygon>

export type EditorObstacleOptions = {
	bounds?: [number, number, number, number]
	map?: MaplibreMap | null
	/** Default true when map is set. */
	includeWater?: boolean
	waterUseCache?: boolean
	waterMaxFeatures?: number
	/** MultiPolygon part indices to clip; others are left unchanged. */
	editedPartIndices?: number[]
}

/** Mapbox Draw coord paths → MultiPolygon part indices (Polygon → [0]). */
export function editedPartIndicesFromCoordPaths(
	paths: string[],
	geometry: Polygon | MultiPolygon
): number[] {
	if (geometry.type === 'Polygon') return [0]

	const indices = new Set<number>()
	for (const path of paths) {
		const part = Number.parseInt(path.split('.')[0], 10)
		if (!Number.isNaN(part)) indices.add(part)
	}
	return [...indices].sort((a, b) => a - b)
}

export function listEditorObstacles(
	collection: FeatureCollection,
	entityId: string,
	options: EditorObstacleOptions = {}
): AreaFeature[] {
	const neighbors = listNeighborObstacles(collection, entityId, options.bounds)
	const includeWater = options.includeWater !== false

	if (!includeWater || !options.map) return neighbors

	const waterBounds = options.bounds ? expandObstacleBounds(options.bounds) : undefined
	const water = listWaterObstaclesFromMap(options.map, waterBounds, {
		useCache: options.waterUseCache,
		maxFeatures: options.waterMaxFeatures
	})
	if (!water.length) return neighbors

	return [...neighbors, ...water]
}

function isWaterObstacle(feature: AreaFeature): boolean {
	return feature.properties?.obstacle_kind === 'water'
}

const MIN_OVERLAP_SQ_M = 1
const LAT_LIMIT = 85
const LNG_LIMIT = 180

function isAreaFeature(feature: Feature): feature is AreaFeature {
	return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
}

function exteriorVertices(feature: AreaFeature): Position[] {
	const vertices: Position[] = []

	if (feature.geometry.type === 'Polygon') {
		for (const ring of feature.geometry.coordinates) {
			for (let i = 0; i < ring.length - 1; i++) vertices.push(ring[i])
		}
		return vertices
	}

	for (const part of feature.geometry.coordinates) {
		for (const ring of part) {
			for (let i = 0; i < ring.length - 1; i++) vertices.push(ring[i])
		}
	}

	return vertices
}

export function verticesInWorldBounds(feature: AreaFeature): boolean {
	for (const [lng, lat] of exteriorVertices(feature)) {
		if (lat > LAT_LIMIT || lat < -LAT_LIMIT) return false
		if (lng > LNG_LIMIT || lng < -LNG_LIMIT) return false
	}
	return true
}

export function listNeighborObstacles(
	collection: FeatureCollection,
	entityId: string,
	targetBounds?: [number, number, number, number]
): AreaFeature[] {
	return collection.features.filter((feature) => {
		if (feature.properties?.entity_id === entityId) return false
		if (!isAreaFeature(feature)) return false
		if (!targetBounds) return true
		return boundsIntersect(bbox(feature) as [number, number, number, number], targetBounds)
	}) as AreaFeature[]
}

export function vertexInsideNeighbor(
	coordinate: Position,
	obstacles: AreaFeature[],
	ignoreBoundary = true
): boolean {
	for (const obstacle of obstacles) {
		if (booleanPointInPolygon(coordinate, obstacle, { ignoreBoundary })) {
			return true
		}
	}
	return false
}

export function verticesInsideNeighbors(
	feature: AreaFeature,
	obstacles: AreaFeature[]
): boolean {
	for (const coordinate of exteriorVertices(feature)) {
		if (vertexInsideNeighbor(coordinate, obstacles)) return true
	}
	return false
}

export function overlapsNeighbors(
	feature: AreaFeature,
	obstacles: AreaFeature[]
): boolean {
	for (const obstacle of obstacles) {
		if (!boundsIntersect(bbox(feature) as [number, number, number, number], bbox(obstacle) as [number, number, number, number])) {
			continue
		}

		try {
			const hit = intersect(featureCollection([feature, obstacle]))
			if (hit && area(hit) > MIN_OVERLAP_SQ_M) return true
		} catch {
			continue
		}
	}

	return false
}

function extractExteriorRings(feature: AreaFeature): Position[][] {
	if (feature.geometry.type === 'Polygon') {
		return [feature.geometry.coordinates[0]]
	}
	return feature.geometry.coordinates.map((part) => part[0])
}

function clampToWorldBounds([lng, lat]: Position): Position {
	return [
		Math.max(-LNG_LIMIT, Math.min(LNG_LIMIT, lng)),
		Math.max(-LAT_LIMIT, Math.min(LAT_LIMIT, lat))
	]
}

function nearestPointOnSegment(
	point: Position,
	a: Position,
	b: Position
): { point: Position; distSq: number } {
	const dx = b[0] - a[0]
	const dy = b[1] - a[1]
	const lenSq = dx * dx + dy * dy

	if (lenSq < 1e-18) {
		const distSq = (point[0] - a[0]) ** 2 + (point[1] - a[1]) ** 2
		return { point: [a[0], a[1]], distSq }
	}

	let t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq
	t = Math.max(0, Math.min(1, t))

	const px = a[0] + t * dx
	const py = a[1] + t * dy
	return { point: [px, py], distSq: (point[0] - px) ** 2 + (point[1] - py) ** 2 }
}

function nearestPointOnRing(point: Position, ring: Position[]): Position {
	let best: Position = point
	let bestDist = Infinity

	for (let i = 0; i < ring.length - 1; i++) {
		const { point: candidate, distSq } = nearestPointOnSegment(point, ring[i], ring[i + 1])
		if (distSq < bestDist) {
			bestDist = distSq
			best = candidate
		}
	}

	return best
}

function nearestPointOnObstacleBoundaries(point: Position, obstacles: AreaFeature[]): Position {
	let best: Position = point
	let bestDist = Infinity

	for (const obstacle of obstacles) {
		for (const ring of extractExteriorRings(obstacle)) {
			const candidate = nearestPointOnRing(point, ring)
			const distSq = (point[0] - candidate[0]) ** 2 + (point[1] - candidate[1]) ** 2
			if (distSq < bestDist) {
				bestDist = distSq
				best = candidate
			}
		}
	}

	return best
}

function nearbyObstacles(point: Position, obstacles: AreaFeature[], padDeg = 2): AreaFeature[] {
	const bounds: [number, number, number, number] = [
		point[0] - padDeg,
		point[1] - padDeg,
		point[0] + padDeg,
		point[1] + padDeg
	]
	return obstacles.filter((obstacle) =>
		boundsIntersect(bbox(obstacle) as [number, number, number, number], bounds)
	)
}

function nearbyObstaclesForSegment(
	from: Position,
	to: Position,
	obstacles: AreaFeature[],
	padDeg = 0.5
): AreaFeature[] {
	const bounds: [number, number, number, number] = [
		Math.min(from[0], to[0]) - padDeg,
		Math.min(from[1], to[1]) - padDeg,
		Math.max(from[0], to[0]) + padDeg,
		Math.max(from[1], to[1]) + padDeg
	]
	return obstacles.filter((obstacle) =>
		boundsIntersect(bbox(obstacle) as [number, number, number, number], bounds)
	)
}

const MIN_HIT_OFFSET = 1e-7
/** ~15 m at mid-latitudes — vertex considered "on" a neighbor border. */
const NEAR_EDGE_SQ = 0.00012 ** 2
/** ~30 m — point sits in a narrow gap between two neighbors. */
const GAP_DIST_SQ = 0.00025 ** 2

function cross2d(a: Position, b: Position): number {
	return a[0] * b[1] - a[1] * b[0]
}

function paramOnSegment(point: Position, a: Position, b: Position): number {
	const dx = b[0] - a[0]
	const dy = b[1] - a[1]
	const lenSq = dx * dx + dy * dy
	if (lenSq < 1e-18) return 0
	return ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq
}

/** True when `to` lies in the exterior wedge beyond a convex/concave corner. */
function isPastExteriorCorner(
	from: Position,
	to: Position,
	prev: Position,
	corner: Position,
	next: Position
): boolean {
	const { distSq: edgeDistSq } = nearestPointOnSegment(from, prev, corner)
	if (edgeDistSq > NEAR_EDGE_SQ) return false

	if (paramOnSegment(from, prev, corner) < 0.2) return false

	const dIn: Position = [corner[0] - prev[0], corner[1] - prev[1]]
	const dOut: Position = [next[0] - corner[0], next[1] - corner[1]]
	const dTo: Position = [to[0] - corner[0], to[1] - corner[1]]

	const turn = cross2d(dIn, dOut)
	if (Math.abs(turn) < 1e-15 || dTo[0] ** 2 + dTo[1] ** 2 < 1e-18) return false

	return cross2d(dIn, dTo) * turn > 0 && cross2d(dOut, dTo) * turn < 0
}

function firstExteriorCornerStop(
	from: Position,
	to: Position,
	obstacles: AreaFeature[]
): Position | null {
	let bestT = Infinity
	let best: Position | null = null

	const considerCorner = (prev: Position, corner: Position, next: Position): void => {
		if (!isPastExteriorCorner(from, to, prev, corner, next)) return
		const t = paramAlongSegment(from, to, corner)
		if (t <= MIN_HIT_OFFSET || t >= 1) return
		if (t < bestT) {
		 bestT = t
		 best = corner
		}
	}

	for (const obstacle of obstacles) {
		for (const ring of extractExteriorRings(obstacle)) {
			for (let i = 0; i < ring.length - 1; i++) {
				const a = ring[i]
				const b = ring[i + 1]
				const prevBeforeA = ring[i === 0 ? ring.length - 2 : i - 1]
				const nextAfterB = ring[i + 2] ?? ring[1]

				const { distSq: onEdge } = nearestPointOnSegment(from, a, b)
				if (onEdge > NEAR_EDGE_SQ) continue

				const along = paramOnSegment(from, a, b)

				// Approaching b along a → b
				if (along > 0.2) {
					considerCorner(a, b, nextAfterB)
				}

				// Approaching a along b → a
				if (along < 0.8) {
					considerCorner(b, a, prevBeforeA)
				}
			}
		}
	}

	return best
}

function distanceToObstacleBoundary(point: Position, obstacle: AreaFeature): number {
	return Math.sqrt(distSq(point, nearestPointOnObstacleBoundaries(point, [obstacle])))
}

/** Narrow gap between two neighbor polygons — not inside either, but wedged between. */
function pointInNeighborGap(to: Position, obstacles: AreaFeature[]): boolean {
	if (vertexInsideNeighbor(to, obstacles, true)) return false

	let close = 0
	for (const obstacle of obstacles) {
		if (distanceToObstacleBoundary(to, obstacle) ** 2 <= GAP_DIST_SQ) close++
	}
	return close >= 2
}

function gapCornerFallback(from: Position, to: Position, obstacles: AreaFeature[]): Position | null {
	if (!pointInNeighborGap(to, obstacles)) return null

	let bestCorner: Position | null = null
	let bestDist = Infinity

	for (const obstacle of obstacles) {
		for (const ring of extractExteriorRings(obstacle)) {
			for (let i = 0; i < ring.length - 1; i++) {
				const a = ring[i]
				const b = ring[i + 1]
				const prevBeforeA = ring[i === 0 ? ring.length - 2 : i - 1]
				const nextAfterB = ring[i + 2] ?? ring[1]

				const { distSq: onEdge } = nearestPointOnSegment(from, a, b)
				if (onEdge > NEAR_EDGE_SQ) continue

				const along = paramOnSegment(from, a, b)
				const corners: [Position, Position, Position][] = []
				if (along > 0.2) corners.push([a, b, nextAfterB])
				if (along < 0.8) corners.push([b, a, prevBeforeA])

				for (const [prev, corner, next] of corners) {
					if (!isPastExteriorCorner(from, to, prev, corner, next)) continue
					const d = distSq(from, corner)
					if (d < bestDist) {
						bestDist = d
						bestCorner = corner
					}
				}
			}
		}
	}

	return bestCorner
}

function firstInteriorEntryStop(
	from: Position,
	to: Position,
	obstacles: AreaFeature[]
): Position | null {
	for (let step = 1; step <= 32; step++) {
		const t = step / 32
		const sample: Position = [
			from[0] + t * (to[0] - from[0]),
			from[1] + t * (to[1] - from[1])
		]
		if (!vertexInsideNeighbor(sample, obstacles, true)) continue

		let lo = (step - 1) / 32
		let hi = t
		for (let i = 0; i < 12; i++) {
			const mid = (lo + hi) / 2
			const probe: Position = [
				from[0] + mid * (to[0] - from[0]),
				from[1] + mid * (to[1] - from[1])
			]
			if (vertexInsideNeighbor(probe, obstacles, true)) hi = mid
			else lo = mid
		}

		const boundary = nearestPointOnObstacleBoundaries(
			[
				from[0] + lo * (to[0] - from[0]),
				from[1] + lo * (to[1] - from[1])
			],
			obstacles
		)
		return boundary
	}

	return null
}

function earliestPathStop(
	from: Position,
	to: Position,
	obstacles: AreaFeature[]
): Position | null {
	const cornerStop = firstExteriorCornerStop(from, to, obstacles)
	if (cornerStop) return cornerStop

	const candidates: Position[] = []

	const boundaryHit = firstSegmentBoundaryHit(from, to, obstacles)
	if (boundaryHit) candidates.push(boundaryHit)

	const interiorStop = firstInteriorEntryStop(from, to, obstacles)
	if (interiorStop) candidates.push(interiorStop)

	const gapStop = gapCornerFallback(from, to, obstacles)
	if (gapStop) candidates.push(gapStop)

	if (!candidates.length) return null

	let best = candidates[0]
	let bestT = paramAlongSegment(from, to, best)

	for (const candidate of candidates.slice(1)) {
		const t = paramAlongSegment(from, to, candidate)
		if (t > MIN_HIT_OFFSET && t < bestT) {
			bestT = t
			best = candidate
		}
	}

	return bestT > MIN_HIT_OFFSET ? best : null
}

function distSq(a: Position, b: Position): number {
	return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
}

function segmentSegmentIntersection(
	a1: Position,
	a2: Position,
	b1: Position,
	b2: Position
): Position | null {
	const x1 = a1[0]
	const y1 = a1[1]
	const x2 = a2[0]
	const y2 = a2[1]
	const x3 = b1[0]
	const y3 = b1[1]
	const x4 = b2[0]
	const y4 = b2[1]
	const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

	if (Math.abs(denom) < 1e-15) return null

	const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
	const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

	if (t < 0 || t > 1 || u < 0 || u > 1) return null

	return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
}

function paramAlongSegment(from: Position, to: Position, point: Position): number {
	const dx = to[0] - from[0]
	const dy = to[1] - from[1]
	const lenSq = dx * dx + dy * dy
	if (lenSq < 1e-18) return 0
	return ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / lenSq
}

function firstSegmentBoundaryHit(
	from: Position,
	to: Position,
	obstacles: AreaFeature[]
): Position | null {
	const lenSq = distSq(from, to)
	if (lenSq < 1e-18) return null

	let bestT = Infinity
	let best: Position | null = null

	for (const obstacle of obstacles) {
		for (const ring of extractExteriorRings(obstacle)) {
			for (let i = 0; i < ring.length - 1; i++) {
				const hit = segmentSegmentIntersection(from, to, ring[i], ring[i + 1])
				if (!hit) continue

				const t = paramAlongSegment(from, to, hit)
				if (t <= MIN_HIT_OFFSET || t >= 1 - MIN_HIT_OFFSET) continue
				if (t < bestT) {
					bestT = t
					best = hit
				}
			}
		}
	}

	return best
}

function segmentMidpointInsideNeighbors(
	from: Position,
	to: Position,
	obstacles: AreaFeature[]
): boolean {
	for (let step = 1; step < 8; step++) {
		const t = step / 8
		const sample: Position = [from[0] + t * (to[0] - from[0]), from[1] + t * (to[1] - from[1])]
		if (vertexInsideNeighbor(sample, obstacles, true)) return true
	}
	return false
}

/** Snap a dragged vertex to world limits and neighbor borders; stops at corners between borders. */
export function clampVertexToBorders(
	from: Position,
	to: Position,
	obstacles: AreaFeature[]
): Position {
	const fromWorld = clampToWorldBounds(from)
	const world = clampToWorldBounds(to)
	const relevant = nearbyObstaclesForSegment(fromWorld, world, obstacles)

	if (!relevant.length) return world

	const pathStop = earliestPathStop(fromWorld, world, relevant)
	if (pathStop) return clampToWorldBounds(pathStop)

	if (vertexInsideNeighbor(world, relevant, true)) {
		let clamped = nearestPointOnObstacleBoundaries(world, relevant)
		if (vertexInsideNeighbor(clamped, relevant, true)) {
			clamped = nearestPointOnObstacleBoundaries(clamped, relevant)
		}
		return clampToWorldBounds(clamped)
	}

	if (pointInNeighborGap(world, relevant)) {
		const gapCorner = gapCornerFallback(fromWorld, world, relevant)
		if (gapCorner) return clampToWorldBounds(gapCorner)
	}

	return world
}

/**
 * Multi-vertex drag: rigid follow draw movement into gaps (any direction).
 * Neighbor alignment is applied on mouseup via clipPolygonToNeighbors, not while dragging.
 */
export function clampVerticesToBorders(
	moves: { from: Position; to: Position }[],
	_obstacles: AreaFeature[]
): Position[] {
	if (!moves.length) return []
	if (moves.length === 1) {
		return [clampVertexToBorders(moves[0].from, moves[0].to, _obstacles)]
	}
	return moves.map(({ to }) => clampToWorldBounds(to))
}

function asAreaFeatureParts(feature: AreaFeature): AreaFeature[] {
	if (feature.geometry.type === 'Polygon') return [feature]

	return feature.geometry.coordinates.map(
		(part) =>
			({
				type: 'Feature',
				properties: feature.properties ?? {},
				geometry: { type: 'Polygon', coordinates: part }
			}) as AreaFeature
	)
}

function pickMainClippedPart(clipped: AreaFeature, original: AreaFeature): AreaFeature {
	return reconcileClippedGeometry(clipped, original)
}

function subtractSingleObstacle(remaining: AreaFeature, obstacle: AreaFeature): AreaFeature {
	try {
		const next = difference(featureCollection([remaining, obstacle]))
		if (!next?.geometry) return remaining
		if (next.geometry.type !== 'Polygon' && next.geometry.type !== 'MultiPolygon') return remaining
		return { ...remaining, geometry: next.geometry }
	} catch {
		return remaining
	}
}

function subtractObstacleUnion(feature: AreaFeature, obstacles: AreaFeature[]): AreaFeature | null {
	if (!obstacles.length) return feature

	let remaining: AreaFeature = feature
	const merged = unionAreaFeatures(obstacles)

	if (merged) {
		try {
			const next = difference(featureCollection([remaining, merged]))
			if (next?.geometry?.type === 'Polygon' || next?.geometry?.type === 'MultiPolygon') {
				remaining = { ...remaining, geometry: next.geometry }
			}
		} catch {
			// fall through to per-obstacle subtraction
		}
	}

	if (overlapsNeighbors(remaining, obstacles)) {
		for (const obstacle of obstacles) {
			if (
				!boundsIntersect(
					bbox(remaining) as [number, number, number, number],
					bbox(obstacle) as [number, number, number, number]
				)
			) {
				continue
			}
			remaining = subtractSingleObstacle(remaining, obstacle)
		}
	}

	return remaining
}

/** Countries via union; water pieces subtracted one-by-one (union of water is too heavy). */
function subtractClipObstacles(feature: AreaFeature, obstacles: AreaFeature[]): AreaFeature | null {
	if (!obstacles.length) return feature

	const countries = obstacles.filter((obstacle) => !isWaterObstacle(obstacle))
	const water = obstacles.filter(isWaterObstacle)

	let remaining = countries.length ? subtractObstacleUnion(feature, countries) : feature
	if (!remaining) return null

	if (!water.length || !overlapsNeighbors(remaining, water)) return remaining

	for (const obstacle of water) {
		if (
			!boundsIntersect(
				bbox(remaining) as [number, number, number, number],
				bbox(obstacle) as [number, number, number, number]
			)
		) {
			continue
		}
		remaining = subtractSingleObstacle(remaining, obstacle)
	}

	return remaining
}

function mergeAreaParts(parts: AreaFeature[], original: AreaFeature): AreaFeature {
	if (!parts.length) return original
	if (parts.length === 1) {
		return { ...original, geometry: parts[0].geometry }
	}
	return {
		...original,
		geometry: {
			type: 'MultiPolygon',
			coordinates: parts.map((part) =>
				part.geometry.type === 'Polygon' ? part.geometry.coordinates : part.geometry.coordinates[0]
			)
		}
	}
}

function clipSingleAreaPart(
	part: AreaFeature,
	obstacles: AreaFeature[]
): AreaFeature {
	if (!obstacles.length || !overlapsNeighbors(part, obstacles)) return part

	const clipped = subtractClipObstacles(part, obstacles)
	if (!clipped) return part

	let result = reconcileClippedGeometry(clipped, part)
	if (obstacles.some(isWaterObstacle)) {
		result = simplifyCoastClipRings(result)
	}
	return result
}

function clipSelectedParts(
	feature: AreaFeature,
	parts: AreaFeature[],
	editedPartIndices: number[],
	collection: FeatureCollection,
	entityId: string,
	options: EditorObstacleOptions
): AreaFeature {
	const edited = new Set(editedPartIndices)
	const clippedParts = parts.map((part, index) => {
		if (!edited.has(index)) return part

		const partBounds = bbox(part) as [number, number, number, number]
		const obstacles = listEditorObstacles(collection, entityId, {
			...options,
			bounds: partBounds
		})
		return clipSingleAreaPart(part, obstacles)
	})

	return mergeAreaParts(clippedParts, feature)
}

/** Remove overlap with neighbors and water; keep the part connected to the original territory. */
export function clipPolygonToNeighbors(
	feature: AreaFeature,
	collection: FeatureCollection,
	entityId: string,
	options: EditorObstacleOptions = {}
): AreaFeature {
	const parts = asAreaFeatureParts(feature)
	const editedPartIndices = options.editedPartIndices

	if (editedPartIndices?.length && parts.length > 1) {
		return clipSelectedParts(feature, parts, editedPartIndices, collection, entityId, options)
	}

	const bounds = bbox(feature) as [number, number, number, number]
	const obstacles = listEditorObstacles(collection, entityId, { ...options, bounds })
	if (!obstacles.length || !overlapsNeighbors(feature, obstacles)) return feature

	const clipped = subtractClipObstacles(feature, obstacles)
	if (!clipped) return feature

	const picked = pickMainClippedPart(clipped, feature)
	const clippedAgainstMarine = obstacles.some(isWaterObstacle)
	return clippedAgainstMarine ? simplifyCoastClipRings(picked) : picked
}

/** Edited geometry must not cross neighbor/water borders or world limits. */
export function isEditableGeometryAllowed(
	feature: AreaFeature,
	collection: FeatureCollection,
	entityId: string,
	options: EditorObstacleOptions = {}
): boolean {
	if (!verticesInWorldBounds(feature)) return false

	const obstacles = listEditorObstacles(collection, entityId, {
		...options,
		bounds: bbox(feature) as [number, number, number, number]
	})
	if (!obstacles.length) return true

	if (verticesInsideNeighbors(feature, obstacles)) return false
	if (overlapsNeighbors(feature, obstacles)) return false

	return true
}
