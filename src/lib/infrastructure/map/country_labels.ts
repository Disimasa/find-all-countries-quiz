import type { FeatureCollection } from 'geojson'
import type { BaseMapEra } from '@domain/maps'
import type { Locale } from '@domain/entities'
import { featureCentroid } from './country_centroid.ts'

export function buildCountryLabelPoints(era: BaseMapEra, locale: Locale): FeatureCollection {
	const features = []

	for (const entity of era.getAllEntities()) {
		const mapFeature = era.getGeoJson().features.find(
			(feature) => era.getEntityIdFromFeature(feature) === entity.id
		)
		const center = mapFeature ? featureCentroid(mapFeature) : null
		if (!center) continue

		features.push({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: center },
			properties: {
				id: entity.id,
				name: era.getDisplayName(entity.id, locale)
			}
		})
	}

	return { type: 'FeatureCollection', features }
}
