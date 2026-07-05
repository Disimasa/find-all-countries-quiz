import {
	area,
	booleanIntersects,
	difference,
	featureCollection,
	type Feature,
	type MultiPolygon,
	type Polygon
} from '@turf/turf'
import { normalizeFilledGeometry, reconcileClippedGeometry } from './geometry_cleanup.ts'

export type AreaFeature = Feature<Polygon | MultiPolygon>

const MIN_CHANGED_AREA_SQ_M = 1

export type AreaSubtractResult = {
	feature: AreaFeature
	changed: boolean
	areaBeforeSqM: number
	areaAfterSqM: number
}

/** Boolean difference: remove subtractor from target. */
export function subtractAreaFromEntity(
	target: AreaFeature,
	subtractor: AreaFeature
): AreaSubtractResult {
	const areaBeforeSqM = area(target)

	if (!booleanIntersects(target, subtractor)) {
		return { feature: target, changed: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
	}

	try {
		const diff = difference(featureCollection([target, subtractor]))
		if (!diff?.geometry) {
			return { feature: target, changed: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
		}

		if (diff.geometry.type !== 'Polygon' && diff.geometry.type !== 'MultiPolygon') {
			return { feature: target, changed: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
		}

		const picked = reconcileClippedGeometry({ ...target, geometry: diff.geometry }, target)
		const feature = normalizeFilledGeometry(picked)
		const areaAfterSqM = area(feature)

		return {
			feature,
			changed: areaBeforeSqM - areaAfterSqM > MIN_CHANGED_AREA_SQ_M,
			areaBeforeSqM,
			areaAfterSqM
		}
	} catch {
		return { feature: target, changed: false, areaBeforeSqM, areaAfterSqM: areaBeforeSqM }
	}
}
