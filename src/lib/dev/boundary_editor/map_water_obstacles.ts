import { area, bbox, simplify } from '@turf/turf'
import type { Map as MaplibreMap } from 'maplibre-gl'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { MAP_WATER_LAYER_ID } from '@infrastructure/map/constants'
import { boundsIntersect, type Bounds } from './directional_fill.ts'

export type AreaFeature = Feature<Polygon | MultiPolygon>

const MAX_WATER_DRAG = 18
const MAX_WATER_CLIP = 14
const SIMPLIFY_TOLERANCE = 0.006

type WaterCache = {
	boundsKey: string
	zoom: number
	features: AreaFeature[]
}

let dragCache: WaterCache | null = null

/** OpenMapTiles `water.class` — only seas and oceans, not lakes/rivers. */
const MARINE_WATER_CLASSES = new Set(['ocean', 'sea'])

export function isMarineWaterClass(className: unknown): boolean {
	return typeof className === 'string' && MARINE_WATER_CLASSES.has(className)
}

function isMarineWaterFeature(feature: GeoJSON.Feature): boolean {
	return isMarineWaterClass(feature.properties?.class)
}

function isAreaGeometry(
	geometry: Feature['geometry']
): geometry is Polygon | MultiPolygon {
	return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon'
}

function boundsKey(bounds: Bounds): string {
	return bounds.map((value) => Math.round(value * 1e3)).join(':')
}

function simplifyWaterFeature(feature: AreaFeature): AreaFeature {
	try {
		const simplified = simplify(feature, { tolerance: SIMPLIFY_TOLERANCE, highQuality: false })
		if (simplified.geometry?.type === 'Polygon' || simplified.geometry?.type === 'MultiPolygon') {
			return { ...feature, geometry: simplified.geometry }
		}
	} catch {
		// keep original
	}
	return feature
}

function waterFeatureKey(feature: AreaFeature): string {
	const [west, south, east, north] = bbox(feature) as Bounds
	return `${Math.round(west * 1e4)}:${Math.round(south * 1e4)}:${Math.round(east * 1e4)}:${Math.round(north * 1e4)}`
}

function fetchWaterObstacles(
	map: MaplibreMap,
	targetBounds: Bounds | undefined,
	maxFeatures: number
): AreaFeature[] {
	if (!map.isStyleLoaded()) return []

	let raw: GeoJSON.Feature[]
	try {
		if (targetBounds) {
			const [west, south, east, north] = targetBounds
			const projected = [
				map.project([west, north]),
				map.project([east, south]),
				map.project([west, south]),
				map.project([east, north])
			]
			const xs = projected.map((point) => point.x)
			const ys = projected.map((point) => point.y)
			raw = map.queryRenderedFeatures(
				[
					[Math.min(...xs), Math.min(...ys)],
					[Math.max(...xs), Math.max(...ys)]
				],
				{ layers: [MAP_WATER_LAYER_ID] }
			) as GeoJSON.Feature[]
		} else {
			raw = map.queryRenderedFeatures({ layers: [MAP_WATER_LAYER_ID] }) as GeoJSON.Feature[]
		}
	} catch {
		return []
	}

	const candidates: AreaFeature[] = []
	const seen = new Set<string>()

	for (const feature of raw) {
		if (!isAreaGeometry(feature.geometry)) continue
		if (!isMarineWaterFeature(feature)) continue

		const obstacle = simplifyWaterFeature({
			type: 'Feature',
			properties: {
				obstacle_kind: 'water',
				...(feature.properties ?? {})
			},
			geometry: feature.geometry
		})

		if (targetBounds) {
			const featureBounds = bbox(obstacle) as Bounds
			if (!boundsIntersect(featureBounds, targetBounds)) continue
		}

		const key = waterFeatureKey(obstacle)
		if (seen.has(key)) continue
		seen.add(key)

		candidates.push(obstacle)
	}

	candidates.sort((a, b) => area(b) - area(a))
	return candidates.slice(0, maxFeatures)
}

export function clearWaterObstacleCache(): void {
	dragCache = null
}

/** Call once at drag start — avoids querying water on every mousemove. */
export function primeWaterObstacleCache(map: MaplibreMap, targetBounds: Bounds): void {
	const padded = expandObstacleBounds(targetBounds, 0.2)
	dragCache = {
		boundsKey: boundsKey(padded),
		zoom: Math.round(map.getZoom() * 10) / 10,
		features: fetchWaterObstacles(map, padded, MAX_WATER_DRAG)
	}
}

export type WaterObstacleOptions = {
	maxFeatures?: number
	useCache?: boolean
}

/** Water polygons visible on the basemap near targetBounds. */
export function listWaterObstaclesFromMap(
	map: MaplibreMap,
	targetBounds?: Bounds,
	options: WaterObstacleOptions = {}
): AreaFeature[] {
	const maxFeatures = options.maxFeatures ?? MAX_WATER_CLIP
	const useCache = options.useCache !== false

	if (useCache && targetBounds && dragCache) {
		const padded = expandObstacleBounds(targetBounds, 0.2)
		const zoom = Math.round(map.getZoom() * 10) / 10
		if (dragCache.boundsKey === boundsKey(padded) && dragCache.zoom === zoom) {
			return dragCache.features
		}
	}

	if (!targetBounds) return fetchWaterObstacles(map, undefined, maxFeatures)
	return fetchWaterObstacles(map, expandObstacleBounds(targetBounds, 0.15), maxFeatures)
}

export function expandObstacleBounds(bounds: Bounds, padDeg = 0.2): Bounds {
	return [bounds[0] - padDeg, bounds[1] - padDeg, bounds[2] + padDeg, bounds[3] + padDeg]
}
