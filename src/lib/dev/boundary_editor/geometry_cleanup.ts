import { area, booleanIntersects, centroid, polygon, simplify, union, featureCollection } from '@turf/turf'
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson'

type AreaFeature = Feature<Polygon | MultiPolygon>

/** Drop micro-polygon artifacts left by boolean ops (Mapbox Draw renders each as inner vertices). */
const MIN_PART_AREA_RATIO = 0.001
const MIN_PART_AREA_SQ_M = 50_000

function closeRing(points: Position[]): Position[] {
	if (!points.length) return points
	const first = points[0]
	const last = points[points.length - 1]
	if (first[0] === last[0] && first[1] === last[1]) return points
	return [...points, first]
}

function isCollinear(a: Position, b: Position, c: Position, epsilon = 1e-12): boolean {
	const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
	return Math.abs(cross) < epsilon
}

function removeCollinearRing(ring: Position[]): Position[] {
	if (ring.length < 4) return ring

	const closed =
		ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
	const open = closed ? ring.slice(0, -1) : ring.slice()
	const out: Position[] = []

	for (let i = 0; i < open.length; i++) {
		const prev = open[(i - 1 + open.length) % open.length]
		const cur = open[i]
		const next = open[(i + 1) % open.length]
		if (!isCollinear(prev, cur, next)) out.push(cur)
	}

	if (out.length < 3) return ring
	return closeRing(out)
}

/** Position of a boundary point along the ring perimeter (edge index + t). */
export function ringPathPosition(ring: Position[], point: Position): number {
	let bestPos = 0
	let bestDist = Infinity
	const ringLength = ring.length - 1

	for (let i = 0; i < ringLength; i++) {
		const [ax, ay] = ring[i]
		const [bx, by] = ring[i + 1]
		const dx = bx - ax
		const dy = by - ay
		const lenSq = dx * dx + dy * dy
		if (lenSq < 1e-18) continue

		let t = ((point[0] - ax) * dx + (point[1] - ay) * dy) / lenSq
		t = Math.max(0, Math.min(1, t))

		const px = ax + t * dx
		const py = ay + t * dy
		const dist = (point[0] - px) ** 2 + (point[1] - py) ** 2

		if (dist < bestDist) {
			bestDist = dist
			bestPos = i + t
		}
	}

	return bestPos
}

export function orderBoundaryPairsAlongRing(
	ring: Position[],
	near: Position[],
	far: Position[]
): { near: Position[]; far: Position[] } {
	if (near.length <= 2) return { near, far }

	const indexed = near.map((point, index) => ({
		point,
		far: far[index],
		pos: ringPathPosition(ring, point)
	}))
	indexed.sort((a, b) => a.pos - b.pos)

	let maxGap = -1
	let maxGapAt = 0
	for (let i = 0; i < indexed.length; i++) {
		const next = (i + 1) % indexed.length
		const gap =
			next === 0
				? ring.length - 1 - indexed[i].pos + indexed[next].pos
				: indexed[next].pos - indexed[i].pos
		if (gap > maxGap) {
			maxGap = gap
			maxGapAt = next
		}
	}

	const rotated = [...indexed.slice(maxGapAt), ...indexed.slice(0, maxGapAt)]
	return {
		near: rotated.map((item) => item.point),
		far: rotated.map((item) => item.far)
	}
}

export function dropSliverParts(feature: AreaFeature): AreaFeature {
	if (feature.geometry.type === 'Polygon') return feature

	const parts = feature.geometry.coordinates.map((coords) => ({
		coords,
		sqM: area(polygon(coords))
	}))
	const maxSqM = Math.max(...parts.map((part) => part.sqM))
	const threshold = Math.max(maxSqM * MIN_PART_AREA_RATIO, MIN_PART_AREA_SQ_M)
	const kept = parts.filter((part) => part.sqM >= threshold)

	if (!kept.length) return feature
	if (kept.length === 1) {
		return {
			...feature,
			geometry: { type: 'Polygon', coordinates: kept[0].coords }
		}
	}

	return {
		...feature,
		geometry: {
			type: 'MultiPolygon',
			coordinates: kept.map((part) => part.coords)
		}
	}
}

function asPolygonFeatures(feature: AreaFeature): Feature<Polygon>[] {
	if (feature.geometry.type === 'Polygon') {
		return [feature as Feature<Polygon>]
	}
	return feature.geometry.coordinates.map(
		(coords) =>
			({
				type: 'Feature',
				properties: {},
				geometry: { type: 'Polygon', coordinates: coords }
			}) as Feature<Polygon>
	)
}

function asAreaGeometry(geometry: Feature['geometry']): Polygon | MultiPolygon | null {
	if (geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon') return geometry
	return null
}

const UNION_SIMPLIFY_TOLERANCE = 0.001

/** Turf union on many vertices can overflow; merge pairwise with simplify fallback. */
export function unionAreaFeatures(parts: AreaFeature[]): AreaFeature | null {
	if (!parts.length) return null

	let acc: AreaFeature = parts[0]

	for (let i = 1; i < parts.length; i++) {
		const part = parts[i]
		let merged: AreaFeature | null = null

		try {
			const result = union(featureCollection([acc, part]))
			const geometry = asAreaGeometry(result?.geometry ?? null)
			if (geometry) {
				merged = { type: 'Feature', properties: acc.properties ?? {}, geometry }
			}
		} catch {
			// try simplified part below
		}

		if (!merged) {
			try {
				const simplified = simplify(part, {
					tolerance: UNION_SIMPLIFY_TOLERANCE,
					highQuality: false
				}) as AreaFeature
				const result = union(featureCollection([acc, simplified]))
				const geometry = asAreaGeometry(result?.geometry ?? null)
				if (geometry) {
					merged = { type: 'Feature', properties: acc.properties ?? {}, geometry }
				}
			} catch {
				continue
			}
		}

		if (merged) acc = merged
	}

	return acc
}

/** Merge touching parts so Draw gets one ring where possible. */
export function mergeAdjacentParts(feature: AreaFeature): AreaFeature {
	let parts = asPolygonFeatures(dropSliverParts(feature))

	for (let attempt = 0; attempt < 32 && parts.length > 1; attempt++) {
		let merged = false

		for (let i = 0; i < parts.length; i++) {
			for (let j = i + 1; j < parts.length; j++) {
				if (!booleanIntersects(parts[i], parts[j])) continue

				const unioned = unionAreaFeatures([parts[i], parts[j]])
				if (!unioned?.geometry) continue

				parts = parts.filter((_, index) => index !== i && index !== j)
				parts.push(...asPolygonFeatures(unioned))
				merged = true
				break
			}
			if (merged) break
		}

		if (!merged) break
	}

	if (parts.length === 1) {
		return {
			...feature,
			properties: feature.properties,
			geometry: parts[0].geometry
		}
	}

	if (parts.length > 1) {
		const unioned = unionAreaFeatures(parts)
		if (unioned?.geometry.type === 'Polygon') {
			return { ...feature, properties: feature.properties, geometry: unioned.geometry }
		}
		if (unioned?.geometry.type === 'MultiPolygon') {
			return { ...feature, geometry: unioned.geometry }
		}
	}

	return {
		...feature,
		geometry: {
			type: 'MultiPolygon',
			coordinates: parts.map((part) => part.geometry.coordinates)
		}
	}
}

export function normalizeFilledGeometry(feature: AreaFeature): AreaFeature {
	return cleanAreaFeature(mergeAdjacentParts(dropSliverParts(feature)))
}

/** ~200 m at mid-latitudes — smooths coastline vertices from basemap water clip. */
export const COAST_CLIP_SIMPLIFY_TOLERANCE = 0.002

function exteriorVertexCount(feature: AreaFeature): number {
	if (feature.geometry.type === 'Polygon') {
		return feature.geometry.coordinates.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0)
	}
	return feature.geometry.coordinates.reduce(
		(sum, part) => sum + part.reduce((partSum, ring) => partSum + Math.max(0, ring.length - 1), 0),
		0
	)
}

/** Douglas–Peucker + collinear cleanup after coast clip against marine water. */
export function simplifyCoastClipRings(
	feature: AreaFeature,
	tolerance = COAST_CLIP_SIMPLIFY_TOLERANCE
): AreaFeature {
	try {
		const simplified = simplify(feature, { tolerance, highQuality: false }) as AreaFeature
		if (simplified.geometry?.type !== 'Polygon' && simplified.geometry?.type !== 'MultiPolygon') {
			return cleanAreaFeature(feature)
		}
		return cleanAreaFeature({ ...feature, geometry: simplified.geometry })
	} catch {
		return cleanAreaFeature(feature)
	}
}

/**
 * After boolean clip/subtract keep every original component (e.g. each island),
 * not only the largest polygon.
 */
export function reconcileClippedGeometry(clipped: AreaFeature, original: AreaFeature): AreaFeature {
	const clippedParts = asPolygonFeatures(clipped)
	if (clippedParts.length === 1) {
		return { ...original, geometry: clippedParts[0].geometry }
	}

	const originalParts = asPolygonFeatures(original)
	const kept: Polygon['coordinates'][] = []

	for (const origPart of originalParts) {
		const pieces = clippedParts.filter((part) => booleanIntersects(origPart, part))
		if (!pieces.length) continue

		if (pieces.length === 1) {
			kept.push(pieces[0].geometry.coordinates)
			continue
		}

		const unioned = unionAreaFeatures(pieces as AreaFeature[])
		if (unioned?.geometry.type === 'Polygon') {
			kept.push(unioned.geometry.coordinates)
		} else if (unioned?.geometry.type === 'MultiPolygon') {
			kept.push(...unioned.geometry.coordinates)
		}
	}

	if (!kept.length) return original

	if (kept.length === 1) {
		return { ...original, geometry: { type: 'Polygon', coordinates: kept[0] } }
	}

	return {
		...original,
		geometry: { type: 'MultiPolygon', coordinates: kept }
	}
}

function ringSignature(ring: Position[]): string {
	const closed = closeRing(ring)
	const hole = polygon([closed])
	const [lng, lat] = centroid(hole).geometry.coordinates
	return `${Math.round(lng * 10_000)}:${Math.round(lat * 10_000)}:${Math.round(area(hole))}`
}

function collectHoleSignatures(feature: AreaFeature): Set<string> {
	const signatures = new Set<string>()

	if (feature.geometry.type === 'Polygon') {
		for (const ring of feature.geometry.coordinates.slice(1)) {
			signatures.add(ringSignature(ring))
		}
		return signatures
	}

	for (const part of feature.geometry.coordinates) {
		for (const ring of part.slice(1)) {
			signatures.add(ringSignature(ring))
		}
	}

	return signatures
}

function filterPolygonHoles(
	coordinates: Polygon['coordinates'],
	keepSignatures: Set<string>
): Polygon['coordinates'] {
	const exterior = coordinates[0]
	const keptHoles = coordinates.slice(1).filter((ring) => keepSignatures.has(ringSignature(ring)))
	return keptHoles.length ? [exterior, ...keptHoles] : [exterior]
}

/** Boolean fill often adds spurious inner rings; Mapbox Draw renders them as in-polygon vertices. */
export function stripFillArtifactHoles(result: AreaFeature, original: AreaFeature): AreaFeature {
	const keepSignatures = collectHoleSignatures(original)

	if (result.geometry.type === 'Polygon') {
		return {
			...result,
			geometry: {
				type: 'Polygon',
				coordinates: filterPolygonHoles(result.geometry.coordinates, keepSignatures)
			}
		}
	}

	return {
		...result,
		geometry: {
			type: 'MultiPolygon',
			coordinates: result.geometry.coordinates.map((part) =>
				filterPolygonHoles(part, keepSignatures)
			)
		}
	}
}

export function cleanAreaFeature(feature: AreaFeature): AreaFeature {
	if (feature.geometry.type === 'Polygon') {
		return {
			...feature,
			geometry: {
				type: 'Polygon',
				coordinates: feature.geometry.coordinates.map((ring) => removeCollinearRing(ring))
			}
		}
	}

	return {
		...feature,
		geometry: {
			type: 'MultiPolygon',
			coordinates: feature.geometry.coordinates.map((part) =>
				part.map((ring) => removeCollinearRing(ring))
			)
		}
	}
}
