import type { SymbolLayerSpecification } from 'maplibre-gl'
import type { Map } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { BaseMapEra } from '@domain/maps'
import type { Locale } from '@domain/entities'
import { HIDDEN_BOUNDARY_LAYER_IDS } from './constants.ts'
import { featureCentroid } from './country_centroid.ts'

/** OpenFreeMap Positron country label layers. */
export const BASEMAP_COUNTRY_LABEL_LAYER_PATTERN = /^label_country_[123]$/

export const EXPLORE_ERA_LABELS_SOURCE_ID = 'explore-era-labels'
export const EXPLORE_ERA_LABELS_LAYER_ID = 'explore-era-labels'

export const EDITOR_ERA_LABELS_SOURCE_ID = 'editor-era-labels'
export const EDITOR_ERA_LABELS_LAYER_ID = 'editor-era-labels'

/** Glyphs available in OpenFreeMap Positron (see style `glyphs` + layer text-font). */
export const BASEMAP_ERA_LABEL_FONTS = ['Noto Sans Regular']

export function buildEraMapLabelLayerOptions(): {
	layout: NonNullable<SymbolLayerSpecification['layout']>
	paint: NonNullable<SymbolLayerSpecification['paint']>
} {
	return {
		layout: {
			'text-field': ['get', 'label'],
			'text-font': BASEMAP_ERA_LABEL_FONTS,
			'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 5, 13, 8, 16],
			'text-max-width': 10,
			'text-letter-spacing': 0.02,
			'text-allow-overlap': true,
			'text-ignore-placement': true
		},
		paint: {
			'text-color': '#3d3630',
			'text-halo-color': 'rgba(255, 248, 235, 0.88)',
			'text-halo-width': 1.25
		}
	}
}

const CUSTOM_LABEL_LAYER_IDS = new Set([
	EXPLORE_ERA_LABELS_LAYER_ID,
	EDITOR_ERA_LABELS_LAYER_ID
])

export function isBasemapCountryLabelLayerId(id: string): boolean {
	return BASEMAP_COUNTRY_LABEL_LAYER_PATTERN.test(id)
}

export function basemapSymbolLayerVisibility(layerId: string): 'visible' | 'none' {
	if (CUSTOM_LABEL_LAYER_IDS.has(layerId)) return 'none'
	return isBasemapCountryLabelLayerId(layerId) ? 'visible' : 'none'
}

function hideBasemapAdminBoundaries(map: Map): void {
	for (const layerId of HIDDEN_BOUNDARY_LAYER_IDS) {
		if (map.getLayer(layerId)) {
			map.setLayoutProperty(layerId, 'visibility', 'none')
		}
	}
}

/** Hide cities and basemap country names; keep admin borders visible. */
export function configureEditorBasemap(map: Map): void {
	if (!map.isStyleLoaded()) return

	for (const layer of map.getStyle().layers ?? []) {
		if (layer.type !== 'symbol' || CUSTOM_LABEL_LAYER_IDS.has(layer.id)) continue
		map.setLayoutProperty(layer.id, 'visibility', 'none')
	}
}

/** Modern country names in Russian; hide cities. Admin borders hidden (quiz map). */
export function configureRussianCountryBasemapLabels(map: Map): void {
	if (!map.isStyleLoaded()) return

	const ruTextField = buildExploreCountryTextField('ru')

	for (const layer of map.getStyle().layers ?? []) {
		if (layer.type !== 'symbol' || CUSTOM_LABEL_LAYER_IDS.has(layer.id)) continue
		const visibility = basemapSymbolLayerVisibility(layer.id)
		map.setLayoutProperty(layer.id, 'visibility', visibility)
		if (visibility === 'visible') {
			map.setLayoutProperty(layer.id, 'text-field', ruTextField)
		}
	}

	hideBasemapAdminBoundaries(map)
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
