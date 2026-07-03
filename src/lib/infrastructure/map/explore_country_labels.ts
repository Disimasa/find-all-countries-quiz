import type { FeatureCollection } from 'geojson'
import type { BaseMapEra } from '@domain/maps'
import type { Locale } from '@domain/entities'
import { featureCentroid } from './country_centroid.ts'

/** OpenFreeMap Positron country label layers. */
export const BASEMAP_COUNTRY_LABEL_LAYER_PATTERN = /^label_country_[123]$/

export const EXPLORE_ERA_LABELS_SOURCE_ID = 'explore-era-labels'
export const EXPLORE_ERA_LABELS_LAYER_ID = 'explore-era-labels'

export function isBasemapCountryLabelLayerId(id: string): boolean {
	return BASEMAP_COUNTRY_LABEL_LAYER_PATTERN.test(id)
}

/** Single-line country label from OpenMapTiles place layer, without name:nonlatin. */
export function buildExploreCountryTextField(locale: Locale): readonly unknown[] {
	if (locale === 'ru') {
		return ['coalesce', ['get', 'name:ru'], ['get', 'name_en'], ['get', 'name']]
	}

	return ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']]
}

/** Era entity names at polygon centroids — used in explore instead of basemap labels. */
export function buildExploreEraLabelsCollection(
	era: BaseMapEra,
	locale: Locale
): FeatureCollection {
	const features = []

	for (const feature of era.getGeoJson().features) {
		const id = era.getEntityIdFromFeature(feature)
		if (!id) continue

		const coordinates = featureCentroid(feature)
		if (!coordinates) continue

		features.push({
			type: 'Feature',
			properties: {
				entity_id: id,
				label: era.getDisplayName(id, locale)
			},
			geometry: { type: 'Point', coordinates }
		})
	}

	return { type: 'FeatureCollection', features }
}
