import type { Locale } from '@domain/entities'

/** OpenFreeMap Positron country label layers. */
export const BASEMAP_COUNTRY_LABEL_LAYER_PATTERN = /^label_country_[123]$/

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
