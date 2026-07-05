import {
	area,
	bbox,
	booleanIntersects,
	difference,
	featureCollection,
	polygon,
	union,
	type Feature,
	type FeatureCollection,
	type MultiPolygon,
	type Polygon,
	type Position
} from '@turf/turf'
import {
	normalizeFilledGeometry,
	orderBoundaryPairsAlongRing,
	stripFillArtifactHoles,
	unionAreaFeatures
} from './geometry_cleanup.ts'

export type FillDirection = 'north' | 'south' | 'east' | 'west'

export const FILL_DIRECTION_LABELS: Record<FillDirection, string> = {
	north: 'север',
	south: 'юг',
	east: 'восток',
	west: 'запад'
}

type AreaFeature = Feature<Polygon | MultiPolygon>
type Bounds = [number, number, number, number]

const LAT_LIMIT = 85
const LNG_LIMIT = 180
const LATERAL_PAD_DEG = 0.01
const MIN_FREE_AREA_SQ_M = 1
const MIN_EXTENT_DEG = 0.000_1

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
	return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3])
}

function isAreaFeature(feature: Feature): feature is AreaFeature {
	return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
}

function extractExteriorRings(target: AreaFeature): Position[][] {
	if (target.geometry.type === 'Polygon') {
		return [target.geometry.coordinates[0]]
	}
	return target.geometry.coordinates.map((part) => part[0])
}

function collectLongitudeSamples(ring: Position[], obstacles: AreaFeature[] = []): number[] {
	const values = new Set<number>()
	const minLng = Math.min(...ring.map(([lng]) => lng))
	const maxLng = Math.max(...ring.map(([lng]) => lng))

	for (let i = 0; i < ring.length - 1; i++) {
		values.add(ring[i][0])
		values.add((ring[i][0] + ring[i + 1][0]) / 2)
	}

	for (const obstacle of obstacles) {
		for (const obstacleRing of extractExteriorRings(obstacle)) {
			for (let i = 0; i < obstacleRing.length - 1; i++) {
				const [lng] = obstacleRing[i]
				if (lng < minLng - LATERAL_PAD_DEG || lng > maxLng + LATERAL_PAD_DEG) continue
				values.add(lng)
				values.add((obstacleRing[i][0] + obstacleRing[i + 1][0]) / 2)
			}
		}
	}

	return [...values].sort((a, b) => a - b)
}

function collectLatitudeSamples(ring: Position[], obstacles: AreaFeature[] = []): number[] {
	const values = new Set<number>()
	const minLat = Math.min(...ring.map(([, lat]) => lat))
	const maxLat = Math.max(...ring.map(([, lat]) => lat))

	for (let i = 0; i < ring.length - 1; i++) {
		values.add(ring[i][1])
		values.add((ring[i][1] + ring[i + 1][1]) / 2)
	}

	for (const obstacle of obstacles) {
		for (const obstacleRing of extractExteriorRings(obstacle)) {
			for (let i = 0; i < obstacleRing.length - 1; i++) {
				const [, lat] = obstacleRing[i]
				if (lat < minLat - LATERAL_PAD_DEG || lat > maxLat + LATERAL_PAD_DEG) continue
				values.add(lat)
				values.add((obstacleRing[i][1] + obstacleRing[i + 1][1]) / 2)
			}
		}
	}

	return [...values].sort((a, b) => a - b)
}

function obstacleLatExtentAtLongitude(
	obstacle: AreaFeature,
	longitude: number
): [number, number] | null {
	let minLat = Infinity
	let maxLat = -Infinity
	let found = false

	for (const ring of extractExteriorRings(obstacle)) {
		const extent = scanlineExtentsVertical(ring, longitude)
		if (!extent) continue
		found = true
		minLat = Math.min(minLat, extent[0])
		maxLat = Math.max(maxLat, extent[1])
	}

	return found ? [minLat, maxLat] : null
}

function obstacleLngExtentAtLatitude(obstacle: AreaFeature, latitude: number): [number, number] | null {
	let minLng = Infinity
	let maxLng = -Infinity
	let found = false

	for (const ring of extractExteriorRings(obstacle)) {
		const extent = scanlineExtentsHorizontal(ring, latitude)
		if (!extent) continue
		found = true
		minLng = Math.min(minLng, extent[0])
		maxLng = Math.max(maxLng, extent[1])
	}

	return found ? [minLng, maxLng] : null
}

function findScanlineLimitSouth(
	longitude: number,
	yStart: number,
	obstacles: AreaFeature[]
): number {
	let limit = -LAT_LIMIT

	for (const obstacle of obstacles) {
		const extent = obstacleLatExtentAtLongitude(obstacle, longitude)
		if (!extent) continue
		const [obMin, obMax] = extent

		if (obMax <= yStart - MIN_EXTENT_DEG) {
			limit = Math.max(limit, obMax)
			continue
		}

		if (obMin < yStart - MIN_EXTENT_DEG && obMax > yStart - MIN_EXTENT_DEG) {
			limit = Math.max(limit, yStart)
		}
	}

	return limit
}

function findScanlineLimitNorth(
	longitude: number,
	yStart: number,
	obstacles: AreaFeature[]
): number {
	let limit = LAT_LIMIT

	for (const obstacle of obstacles) {
		const extent = obstacleLatExtentAtLongitude(obstacle, longitude)
		if (!extent) continue
		const [obMin, obMax] = extent

		if (obMin >= yStart + MIN_EXTENT_DEG) {
			limit = Math.min(limit, obMin)
			continue
		}

		if (obMax > yStart + MIN_EXTENT_DEG && obMin < yStart + MIN_EXTENT_DEG) {
			limit = Math.min(limit, yStart)
		}
	}

	return limit
}

function findScanlineLimitEast(
	latitude: number,
	xStart: number,
	obstacles: AreaFeature[]
): number {
	let limit = LNG_LIMIT

	for (const obstacle of obstacles) {
		const extent = obstacleLngExtentAtLatitude(obstacle, latitude)
		if (!extent) continue
		const [obMin, obMax] = extent

		if (obMin >= xStart + MIN_EXTENT_DEG) {
			limit = Math.min(limit, obMin)
			continue
		}

		if (obMax > xStart + MIN_EXTENT_DEG && obMin < xStart + MIN_EXTENT_DEG) {
			limit = Math.min(limit, xStart)
		}
	}

	return limit
}

function findScanlineLimitWest(
	latitude: number,
	xStart: number,
	obstacles: AreaFeature[]
): number {
	let limit = -LNG_LIMIT

	for (const obstacle of obstacles) {
		const extent = obstacleLngExtentAtLatitude(obstacle, latitude)
		if (!extent) continue
		const [obMin, obMax] = extent

		if (obMax <= xStart - MIN_EXTENT_DEG) {
			limit = Math.max(limit, obMax)
			continue
		}

		if (obMin < xStart - MIN_EXTENT_DEG && obMax > xStart - MIN_EXTENT_DEG) {
			limit = Math.max(limit, xStart)
		}
	}

	return limit
}

function scanlineExtentsHorizontal(
	ring: Position[],
	latitude: number
): [number, number] | null {
	const xs: number[] = []

	for (let i = 0; i < ring.length - 1; i++) {
		const [x1, y1] = ring[i]
		const [x2, y2] = ring[i + 1]

		if (Math.abs(y1 - y2) < 1e-12) {
			if (Math.abs(y1 - latitude) < 1e-12) {
				xs.push(x1, x2)
			}
			continue
		}

		if ((y1 <= latitude && latitude < y2) || (y2 <= latitude && latitude < y1)) {
			const t = (latitude - y1) / (y2 - y1)
			xs.push(x1 + t * (x2 - x1))
		}
	}

	if (!xs.length) return null
	return [Math.min(...xs), Math.max(...xs)]
}

function scanlineExtentsVertical(ring: Position[], longitude: number): [number, number] | null {
	const ys: number[] = []

	for (let i = 0; i < ring.length - 1; i++) {
		const [x1, y1] = ring[i]
		const [x2, y2] = ring[i + 1]

		if (Math.abs(x1 - x2) < 1e-12) {
			if (Math.abs(x1 - longitude) < 1e-12) {
				ys.push(y1, y2)
			}
			continue
		}

		if ((x1 <= longitude && longitude < x2) || (x2 <= longitude && longitude < x1)) {
			const t = (longitude - x1) / (x2 - x1)
			ys.push(y1 + t * (y2 - y1))
		}
	}

	if (!ys.length) return null
	return [Math.min(...ys), Math.max(...ys)]
}

function buildSilhouetteWedgeForRing(
	ring: Position[],
	direction: FillDirection,
	obstacles: AreaFeature[] = []
): Feature<Polygon> | null {
	const near: Position[] = []
	const far: Position[] = []

	switch (direction) {
		case 'east': {
			for (const latitude of collectLatitudeSamples(ring, obstacles)) {
				const extent = scanlineExtentsHorizontal(ring, latitude)
				if (!extent) continue
				const [, xMax] = extent
				const limit = findScanlineLimitEast(latitude, xMax, obstacles)
				if (xMax >= limit - MIN_EXTENT_DEG) continue
				near.push([xMax, latitude])
				far.push([limit, latitude])
			}
			break
		}
		case 'west': {
			for (const latitude of collectLatitudeSamples(ring, obstacles)) {
				const extent = scanlineExtentsHorizontal(ring, latitude)
				if (!extent) continue
				const [xMin] = extent
				const limit = findScanlineLimitWest(latitude, xMin, obstacles)
				if (xMin <= limit + MIN_EXTENT_DEG) continue
				near.push([xMin, latitude])
				far.push([limit, latitude])
			}
			break
		}
		case 'north': {
			for (const longitude of collectLongitudeSamples(ring, obstacles)) {
				const extent = scanlineExtentsVertical(ring, longitude)
				if (!extent) continue
				const [, yMax] = extent
				const limit = findScanlineLimitNorth(longitude, yMax, obstacles)
				if (yMax >= limit - MIN_EXTENT_DEG) continue
				near.push([longitude, yMax])
				far.push([longitude, limit])
			}
			break
		}
		case 'south': {
			for (const longitude of collectLongitudeSamples(ring, obstacles)) {
				const extent = scanlineExtentsVertical(ring, longitude)
				if (!extent) continue
				const [yMin] = extent
				const limit = findScanlineLimitSouth(longitude, yMin, obstacles)
				if (yMin <= limit + MIN_EXTENT_DEG) continue
				near.push([longitude, yMin])
				far.push([longitude, limit])
			}
			break
		}
	}

	if (near.length < 2) return null

	const ordered = orderBoundaryPairsAlongRing(ring, near, far)
	const ringCoords = [...ordered.near, ...ordered.far.reverse()]
	if (ringCoords.length < 3) return null

	const first = ringCoords[0]
	const last = ringCoords[ringCoords.length - 1]
	const closed =
		first[0] === last[0] && first[1] === last[1] ? ringCoords : [...ringCoords, first]

	return polygon([closed])
}

/** Nearest obstacle bbox edge in the given direction; world limit if none. */
export function findDirectionLimit(
	bounds: Bounds,
	obstacles: AreaFeature[],
	direction: FillDirection
): number {
	const [west, south, east, north] = bounds
	const pad = LATERAL_PAD_DEG

	switch (direction) {
		case 'east': {
			let limit = LNG_LIMIT
			for (const obstacle of obstacles) {
				const [obWest, obSouth, , obNorth] = bbox(obstacle) as Bounds
				if (obWest <= east + pad) continue
				if (obNorth < south - pad || obSouth > north + pad) continue
				limit = Math.min(limit, obWest)
			}
			return limit
		}
		case 'west': {
			let limit = -LNG_LIMIT
			for (const obstacle of obstacles) {
				const [, obSouth, obEast, obNorth] = bbox(obstacle) as Bounds
				if (obEast >= west - pad) continue
				if (obNorth < south - pad || obSouth > north + pad) continue
				limit = Math.max(limit, obEast)
			}
			return limit
		}
		case 'north': {
			let limit = LAT_LIMIT
			for (const obstacle of obstacles) {
				const [obWest, obSouth, obEast] = bbox(obstacle) as Bounds
				if (obSouth <= north + pad) continue
				if (obEast < west - pad || obWest > east + pad) continue
				limit = Math.min(limit, obSouth)
			}
			return limit
		}
		case 'south': {
			let limit = -LAT_LIMIT
			for (const obstacle of obstacles) {
				const [obWest, , obEast, obNorth] = bbox(obstacle) as Bounds
				if (obNorth >= south - pad) continue
				if (obEast < west - pad || obWest > east + pad) continue
				limit = Math.max(limit, obNorth)
			}
			return limit
		}
	}
}

/** Expansion corridor from the actual polygon silhouette, not its bbox. */
export function buildSilhouetteWedge(
	target: AreaFeature,
	direction: FillDirection,
	obstacles: AreaFeature[] = []
): Feature<Polygon | MultiPolygon> | null {
	const wedges: Feature<Polygon>[] = []

	for (const ring of extractExteriorRings(target)) {
		const wedge = buildSilhouetteWedgeForRing(ring, direction, obstacles)
		if (wedge) wedges.push(wedge)
	}

	if (!wedges.length) return null
	if (wedges.length === 1) return wedges[0]

	try {
		const merged = union(featureCollection(wedges))
		if (merged?.geometry?.type === 'Polygon' || merged?.geometry?.type === 'MultiPolygon') {
			return merged as Feature<Polygon | MultiPolygon>
		}
	} catch {
		// fall through to first wedge
	}

	return wedges[0]
}

function subtractObstacles(
	wedge: Feature<Polygon | MultiPolygon>,
	obstacles: AreaFeature[]
): Feature<Polygon | MultiPolygon> | null {
	const wedgeBounds = bbox(wedge) as Bounds
	const blocking = obstacles.filter((obstacle) =>
		boundsIntersect(bbox(obstacle) as Bounds, wedgeBounds)
	)
	if (!blocking.length) return wedge

	let remaining: Feature<Polygon | MultiPolygon> = wedge

	const mergedObstacles = unionAreaFeatures(blocking)
	if (mergedObstacles) {
		try {
			const next = difference(featureCollection([remaining, mergedObstacles]))
			if (next?.geometry) {
				if (next.geometry.type === 'Polygon' || next.geometry.type === 'MultiPolygon') {
					remaining = next as Feature<Polygon | MultiPolygon>
				}
			}
		} catch {
			// fall through to per-obstacle subtraction
		}
	}

	for (const obstacle of blocking) {
		if (!boundsIntersect(bbox(remaining) as Bounds, bbox(obstacle) as Bounds)) continue

		try {
			const next = difference(featureCollection([remaining, obstacle]))
			if (!next?.geometry) continue
			if (next.geometry.type !== 'Polygon' && next.geometry.type !== 'MultiPolygon') continue
			remaining = next as Feature<Polygon | MultiPolygon>
		} catch {
			continue
		}
	}

	return remaining
}

function asAreaFeatures(feature: Feature<Polygon | MultiPolygon> | null): AreaFeature[] {
	if (!feature?.geometry) return []
	if (feature.geometry.type === 'Polygon') return [feature as AreaFeature]
	return feature.geometry.coordinates.map(
		(part) =>
			({
				type: 'Feature',
				properties: feature.properties ?? {},
				geometry: { type: 'Polygon', coordinates: part }
			}) as AreaFeature
	)
}

function connectedAnnexParts(
	target: AreaFeature,
	annex: Feature<Polygon | MultiPolygon>
): AreaFeature[] {
	return asAreaFeatures(annex).filter((part) => booleanIntersects(target, part))
}

function asAreaGeometry(geometry: Feature['geometry']): Polygon | MultiPolygon | null {
	if (geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon') return geometry
	return null
}

function clipObstacleOverlap(feature: AreaFeature, obstacles: AreaFeature[]): AreaFeature {
	let result: AreaFeature = feature

	for (const obstacle of obstacles) {
		if (!boundsIntersect(bbox(result) as Bounds, bbox(obstacle) as Bounds)) continue

		try {
			const next = difference(featureCollection([result, obstacle]))
			if (!next?.geometry) continue
			const geometry = asAreaGeometry(next.geometry)
			if (!geometry) continue
			result = { ...result, geometry }
		} catch {
			continue
		}
	}

	return result
}

export type DirectionalFillResult = {
	feature: AreaFeature
	expanded: boolean
	areaBeforeSqM: number
	areaAfterSqM: number
}

/** Expand entity in a compass direction until other era polygons block the wedge. */
export function fillEntityInDirection(
	target: AreaFeature,
	collection: FeatureCollection,
	entityId: string,
	direction: FillDirection,
	extraObstacles: AreaFeature[] = []
): DirectionalFillResult {
	const areaBeforeSqM = area(target)

	const obstacles = [
		...(collection.features.filter((feature) => {
			if (feature.properties?.entity_id === entityId) return false
			return isAreaFeature(feature)
		}) as AreaFeature[]),
		...extraObstacles
	]

	const wedge = buildSilhouetteWedge(target, direction, obstacles)
	if (!wedge) {
		return { feature: target, expanded: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
	}

	const wedgeBounds = bbox(wedge) as Bounds
	const blocking = obstacles.filter((obstacle) =>
		boundsIntersect(bbox(obstacle) as Bounds, wedgeBounds)
	)

	const free = subtractObstacles(wedge, blocking)
	if (!free || area(free) < MIN_FREE_AREA_SQ_M) {
		return { feature: target, expanded: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
	}

	let annexGeometry: Feature<Polygon | MultiPolygon> = free
	try {
		const stripped = difference(featureCollection([free, target]))
		if (stripped?.geometry && area(stripped) >= MIN_FREE_AREA_SQ_M) {
			annexGeometry = stripped as Feature<Polygon | MultiPolygon>
		}
	} catch {
		// keep wedge-only annex
	}

	const annexParts = connectedAnnexParts(target, annexGeometry)
	if (!annexParts.length) {
		return { feature: target, expanded: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
	}

	const merged = unionAreaFeatures([target, ...annexParts])
	const geometry = asAreaGeometry(merged?.geometry ?? null)
	if (!geometry) {
		return { feature: target, expanded: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
	}

	try {
		const clipped = clipObstacleOverlap(
			{
				type: 'Feature',
				properties: { ...target.properties },
				geometry
			},
			obstacles
		)
		const feature = stripFillArtifactHoles(normalizeFilledGeometry(clipped), target)
		const areaAfterSqM = area(feature)

		return {
			feature,
			expanded: areaAfterSqM > areaBeforeSqM + MIN_FREE_AREA_SQ_M,
			areaBeforeSqM,
			areaAfterSqM
		}
	} catch {
		return { feature: target, expanded: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
	}
}
