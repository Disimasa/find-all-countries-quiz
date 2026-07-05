import {
	distance,
	nearestPointOnLine,
	point,
	polygonToLine,
	type Feature,
	type FeatureCollection,
	type LineString,
	type MultiLineString,
	type MultiPolygon,
	type Point,
	type Polygon,
	type Position
} from '@turf/turf'

export const DEFAULT_SNAP_TOLERANCE_METERS = 2000

type AreaFeature = Feature<Polygon | MultiPolygon>

function collectPositions(
	coordinates: Polygon['coordinates'] | MultiPolygon['coordinates']
): Position[] {
	const positions: Position[] = []
	walkPositions(coordinates, (pos) => {
		positions.push(pos)
		return pos
	})
	return positions
}

export function countMovedVertices(
	before: AreaFeature,
	after: AreaFeature,
	epsilonMeters = 0.5
): number {
	const from = collectPositions(before.geometry.coordinates)
	const to = collectPositions(after.geometry.coordinates)
	const count = Math.min(from.length, to.length)
	let moved = 0

	for (let i = 0; i < count; i++) {
		if (distance(point(from[i]), point(to[i]), { units: 'meters' }) > epsilonMeters) {
			moved++
		}
	}

	return moved
}

function walkPositions(
	coordinates: Polygon['coordinates'] | MultiPolygon['coordinates'],
	visit: (pos: Position) => Position
): Polygon['coordinates'] | MultiPolygon['coordinates'] {
	if (coordinates.length === 0) return coordinates
	if (typeof coordinates[0][0][0] === 'number') {
		return (coordinates as Polygon['coordinates']).map((ring) =>
			ring.map((pos) => visit(pos))
		)
	}
	return (coordinates as MultiPolygon['coordinates']).map((polygon) =>
		polygon.map((ring) => ring.map((pos) => visit(pos)))
	)
}

function dedupeRing(ring: Position[]): Position[] {
	if (ring.length < 2) return ring
	const out: Position[] = [ring[0]]
	for (let i = 1; i < ring.length; i++) {
		const prev = out[out.length - 1]
		const cur = ring[i]
		if (prev[0] !== cur[0] || prev[1] !== cur[1]) out.push(cur)
	}
	const first = out[0]
	const last = out[out.length - 1]
	if (out.length > 2 && first[0] === last[0] && first[1] === last[1]) out.pop()
	return out
}

function dedupeCoordinates(
	coordinates: Polygon['coordinates'] | MultiPolygon['coordinates']
): Polygon['coordinates'] | MultiPolygon['coordinates'] {
	if (coordinates.length === 0) return coordinates
	if (typeof coordinates[0][0][0] === 'number') {
		return (coordinates as Polygon['coordinates']).map((ring) => dedupeRing(ring))
	}
	return (coordinates as MultiPolygon['coordinates']).map((polygon) =>
		polygon.map((ring) => dedupeRing(ring))
	)
}

function collectVertexTargets(neighbors: AreaFeature[]): Point[] {
	const targets: Point[] = []
	for (const neighbor of neighbors) {
		const geom = neighbor.geometry
		const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
		for (const polygon of polygons) {
			for (const ring of polygon) {
				for (const pos of ring) {
					targets.push(point(pos))
				}
			}
		}
	}
	return targets
}

function linesFromLineGeometry(
	coordinates: LineString['coordinates'] | MultiLineString['coordinates'],
	geometryType: LineString['type'] | MultiLineString['type']
): Feature<LineString>[] {
	if (geometryType === 'LineString') {
		return [
			{
				type: 'Feature',
				properties: {},
				geometry: { type: 'LineString', coordinates: coordinates as LineString['coordinates'] }
			}
		]
	}

	return (coordinates as MultiLineString['coordinates']).map((coords) => ({
		type: 'Feature',
		properties: {},
		geometry: { type: 'LineString', coordinates: coords }
	}))
}

function linesFromPolygonToLineResult(
	result: Feature<LineString | MultiLineString> | FeatureCollection<LineString | MultiLineString>
): Feature<LineString>[] {
	if (result.type === 'FeatureCollection') {
		return result.features.flatMap((feature) =>
			feature.geometry
				? linesFromLineGeometry(feature.geometry.coordinates, feature.geometry.type)
				: []
		)
	}

	if (!result.geometry) return []
	return linesFromLineGeometry(result.geometry.coordinates, result.geometry.type)
}

function collectEdgeLines(neighbors: AreaFeature[]): Feature<LineString>[] {
	const lines: Feature<LineString>[] = []
	for (const neighbor of neighbors) {
		if (!neighbor.geometry) continue
		lines.push(...linesFromPolygonToLineResult(polygonToLine(neighbor)))
	}
	return lines
}

function snapPosition(
	pos: Position,
	vertexTargets: Point[],
	edgeLines: Feature<LineString>[],
	toleranceMeters: number
): Position {
	const origin = point(pos)
	let best: Position = pos
	let bestDist = toleranceMeters

	for (const target of vertexTargets) {
		const d = distance(origin, target, { units: 'meters' })
		if (d < bestDist) {
			bestDist = d
			best = target.geometry.coordinates as Position
		}
	}

	for (const line of edgeLines) {
		const nearest = nearestPointOnLine(line, origin)
		const d = distance(origin, nearest, { units: 'meters' })
		if (d < bestDist) {
			bestDist = d
			best = nearest.geometry.coordinates as Position
		}
	}

	return best
}

/** Pull vertices toward nearby neighbor vertices and edges so shared borders coincide. */
export function snapFeatureToNeighbors(
	target: AreaFeature,
	neighbors: AreaFeature[],
	toleranceMeters = DEFAULT_SNAP_TOLERANCE_METERS
): AreaFeature {
	if (!neighbors.length || toleranceMeters <= 0) return target

	const vertexTargets = collectVertexTargets(neighbors)
	const edgeLines = collectEdgeLines(neighbors)
	const snappedCoords = walkPositions(target.geometry.coordinates, (pos) =>
		snapPosition(pos, vertexTargets, edgeLines, toleranceMeters)
	)
	const cleaned = dedupeCoordinates(snappedCoords)

	return {
		type: 'Feature',
		properties: { ...target.properties },
		geometry:
			target.geometry.type === 'Polygon'
				? { type: 'Polygon', coordinates: cleaned as Polygon['coordinates'] }
				: { type: 'MultiPolygon', coordinates: cleaned as MultiPolygon['coordinates'] }
	}
}
