import { describe, expect, it } from 'vitest'
import {
	basemapSymbolLayerVisibility,
	buildExploreCountryTextField,
	buildExploreEraLabelsCollection,
	isBasemapCountryLabelLayerId
} from '@infrastructure/map/explore_country_labels'
import { createStubMapEra, STUB_ENTITIES } from './helpers/stub_map_era'

describe('buildExploreCountryTextField', () => {
	it('uses English OpenMapTiles fields for en', () => {
		expect(buildExploreCountryTextField('en')).toEqual([
			'coalesce',
			['get', 'name_en'],
			['get', 'name:latin'],
			['get', 'name']
		])
	})

	it('uses Russian OpenMapTiles fields for ru', () => {
		expect(buildExploreCountryTextField('ru')).toEqual([
			'coalesce',
			['get', 'name:ru'],
			['get', 'name_en'],
			['get', 'name']
		])
	})
})

describe('basemapSymbolLayerVisibility', () => {
	it('shows only country label layers', () => {
		expect(basemapSymbolLayerVisibility('label_country_1')).toBe('visible')
		expect(basemapSymbolLayerVisibility('label_country_2')).toBe('visible')
		expect(basemapSymbolLayerVisibility('label_city')).toBe('none')
		expect(basemapSymbolLayerVisibility('label_city_capital')).toBe('none')
		expect(basemapSymbolLayerVisibility('label_town')).toBe('none')
		expect(basemapSymbolLayerVisibility('explore-era-labels')).toBe('none')
		expect(basemapSymbolLayerVisibility('editor-era-labels')).toBe('none')
	})
})

describe('isBasemapCountryLabelLayerId', () => {
	it('matches OpenFreeMap country label layers', () => {
		expect(isBasemapCountryLabelLayerId('label_country_1')).toBe(true)
		expect(isBasemapCountryLabelLayerId('label_country_2')).toBe(true)
		expect(isBasemapCountryLabelLayerId('label_country_3')).toBe(true)
	})

	it('ignores city and other symbol layers', () => {
		expect(isBasemapCountryLabelLayerId('label_city')).toBe(false)
		expect(isBasemapCountryLabelLayerId('label_city_capital')).toBe(false)
		expect(isBasemapCountryLabelLayerId('label_town')).toBe(false)
		expect(isBasemapCountryLabelLayerId('country_1')).toBe(false)
	})
})

describe('buildExploreEraLabelsCollection', () => {
	it('uses era display names instead of basemap labels', () => {
		const era = createStubMapEra(STUB_ENTITIES)
		const labels = buildExploreEraLabelsCollection(era, 'ru')
		const germany = labels.features.find((f) => f.properties?.entity_id === 'DE')
		expect(germany?.properties?.label).toBe('Германия')
		expect(labels.features.length).toBe(STUB_ENTITIES.length)
	})
})
