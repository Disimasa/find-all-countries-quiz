import type { LayerSpecification, Map, StyleSpecification } from 'maplibre-gl'
import { readMapBasemapColors } from '@theme'
import {
	HIDDEN_BOUNDARY_LAYER_IDS,
	MAP_WATER_LAYER_ID,
	MAP_WATERWAY_LAYER_ID
} from './constants.ts'

const HIDDEN_LAYER_IDS = new Set<string>(HIDDEN_BOUNDARY_LAYER_IDS)

function hideLayer(layer: LayerSpecification): LayerSpecification {
	const layout =
		'layout' in layer && layer.layout
			? { ...layer.layout, visibility: 'none' as const }
			: { visibility: 'none' as const }
	return { ...layer, layout }
}

/** Strip labels and quiz-conflicting overlays before the first frame. */
export function prepareBasemapStyle(
	_previous: StyleSpecification | undefined,
	next: StyleSpecification
): StyleSpecification {
	if (!next.layers?.length) return next

	const { sprite: _unusedSprites, ...withoutSprites } = next

	return {
		...withoutSprites,
		layers: next.layers.map((layer) => {
			if (layer.type === 'symbol' || HIDDEN_LAYER_IDS.has(layer.id)) {
				return hideLayer(layer)
			}
			return layer
		})
	}
}

export function applyBasemapTheme(map: Map): void {
	const colors = readMapBasemapColors()

	if (map.getLayer(MAP_WATER_LAYER_ID)) {
		map.setPaintProperty(MAP_WATER_LAYER_ID, 'fill-color', colors.water)
	}

	if (map.getLayer(MAP_WATERWAY_LAYER_ID)) {
		map.setPaintProperty(MAP_WATERWAY_LAYER_ID, 'line-color', colors.waterway)
		map.setPaintProperty(MAP_WATERWAY_LAYER_ID, 'line-opacity', colors.waterwayOpacity)
		map.setPaintProperty(MAP_WATERWAY_LAYER_ID, 'line-width', [
			'interpolate',
			['linear'],
			['zoom'],
			2,
			0.35,
			5,
			0.9,
			8,
			1.6
		])
	}
}
