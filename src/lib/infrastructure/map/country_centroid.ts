import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'

export type LngLatBounds = [number, number, number, number]

function ringCentroid(ring: Position[]): [number, number] {
	const n = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] ? ring.length - 1 : ring.length
	if (n <= 0) return [0, 0]

	let x = 0
	let y = 0
	for (let i = 0; i < n; i++) {
		x += ring[i][0]
		y += ring[i][1]
	}
	return [x / n, y / n]
}

function ringBBoxSpan(ring: Position[]): number {
	let minLng = Infinity
	let maxLng = -Infinity
	let minLat = Infinity
	let maxLat = -Infinity

	for (const [lng, lat] of ring) {
		minLng = Math.min(minLng, lng)
		maxLng = Math.max(maxLng, lng)
		minLat = Math.min(minLat, lat)
		maxLat = Math.max(maxLat, lat)
	}

	return Math.max(maxLng - minLng, maxLat - minLat)
}

function polygonBBoxSpan(coordinates: Polygon['coordinates']): number {
	return Math.max(...coordinates.map((ring) => ringBBoxSpan(ring)))
}

function largestPolygonCentroid(polygons: Polygon['coordinates'][]): [number, number] | null {
	let bestRing: Position[] | null = null
	let bestSpan = 0

	for (const polygon of polygons) {
		const ring = polygon[0]
		if (!ring) continue
		const span = ringBBoxSpan(ring)
		if (span > bestSpan) {
			bestSpan = span
			bestRing = ring
		}
	}

	return bestRing ? ringCentroid(bestRing) : null
}

export function featureCentroid(feature: Feature): [number, number] | null {
	const geometry = feature.geometry
	if (geometry.type === 'Polygon') {
		return largestPolygonCentroid([geometry.coordinates])
	}
	if (geometry.type === 'MultiPolygon') {
		return largestPolygonCentroid(geometry.coordinates)
	}
	return null
}

function extendRingBounds(
	bounds: [number, number, number, number],
	ring: Position[]
): void {
	let [west, south, east, north] = bounds
	for (const [lng, lat] of ring) {
		west = Math.min(west, lng)
		east = Math.max(east, lng)
		south = Math.min(south, lat)
		north = Math.max(north, lat)
	}
	bounds[0] = west
	bounds[1] = south
	bounds[2] = east
	bounds[3] = north
}

export function featureBounds(feature: Feature): [number, number, number, number] | null {
	const geometry = feature.geometry
	const bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]

	if (geometry.type === 'Polygon') {
		for (const ring of geometry.coordinates) extendRingBounds(bounds, ring)
	} else if (geometry.type === 'MultiPolygon') {
		for (const polygon of geometry.coordinates) {
			for (const ring of polygon) extendRingBounds(bounds, ring)
		}
	} else {
		return null
	}

	if (!Number.isFinite(bounds[0])) return null
	return bounds
}

export function expandFeatureBounds(
	bounds: [number, number, number, number],
	marginRatio = 0.42,
	minMarginDeg = 1.35
): [number, number, number, number] {
	const [west, south, east, north] = bounds
	const lngSpan = east - west
	const latSpan = north - south
	const lngPad = Math.max(lngSpan * marginRatio, minMarginDeg)
	const latPad = Math.max(latSpan * marginRatio, minMarginDeg)

	return [west - lngPad, south - latPad, east + lngPad, north + latPad]
}

export function featureBBoxSpan(feature: Feature): number {
	const geometry = feature.geometry
	if (geometry.type === 'Polygon') {
		return polygonBBoxSpan(geometry.coordinates)
	}
	if (geometry.type === 'MultiPolygon') {
		return Math.max(...geometry.coordinates.map((polygon) => polygonBBoxSpan(polygon)))
	}
	return 0
}

export function filterTeaserCountryIds(
	collection: FeatureCollection,
	resolveId: (feature: Feature) => string | null,
	minBBoxSpan: number,
	options?: {
		maxCentroidLat?: number
		excludedIds?: readonly string[]
	}
): string[] {
	const excluded = new Set(options?.excludedIds ?? [])
	const maxCentroidLat = options?.maxCentroidLat
	const ids: string[] = []

	for (const feature of collection.features) {
		const id = resolveId(feature)
		if (!id || excluded.has(id)) continue
		if (featureBBoxSpan(feature) < minBBoxSpan) continue

		if (maxCentroidLat !== undefined) {
			const centroid = featureCentroid(feature)
			if (!centroid || centroid[1] > maxCentroidLat) continue
		}

		ids.push(id)
	}

	return ids
}
