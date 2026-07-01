import { describe, expect, it } from 'vitest'
import {
	buildExploreCountryTextField,
	isBasemapCountryLabelLayerId
} from '@infrastructure/map/explore_country_labels'

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
