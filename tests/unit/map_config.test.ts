import { describe, expect, it } from 'vitest'
import {
	MAP_DEFAULT_MAX_FIT_ZOOM,
	MAP_DEFAULT_ZOOM,
	MAP_MAX_ZOOM,
	MAP_MIN_ZOOM,
	MAP_STYLE_URL,
	MAP_WHEEL_ZOOM_RATE,
	MAP_WORLD_BOUNDS
} from '@infrastructure/map/constants'
import { QUIZ_BASEMAP_COLORS_FALLBACK, QUIZ_MAP_THEME_FALLBACK } from '@theme'
import { prepareBasemapStyle } from '@infrastructure/map/basemap_theme'

describe('map constants', () => {
	it('uses a vector basemap style without raster tile labels', () => {
		expect(MAP_STYLE_URL).toContain('openfreemap.org')
		expect(MAP_STYLE_URL).not.toContain('nolabels')
	})

	it('allows zooming out slightly below the default view', () => {
		expect(MAP_MIN_ZOOM).toBeLessThanOrEqual(MAP_DEFAULT_ZOOM)
		expect(MAP_MIN_ZOOM).toBeLessThan(MAP_MAX_ZOOM)
	})

	it('uses faster scroll zoom than MapLibre defaults', () => {
		expect(MAP_WHEEL_ZOOM_RATE).toBeGreaterThan(1 / 450)
	})

	it('fits the world on first load', () => {
		expect(MAP_WORLD_BOUNDS[0]).toBeLessThan(MAP_WORLD_BOUNDS[2])
		expect(MAP_WORLD_BOUNDS[1]).toBeLessThan(MAP_WORLD_BOUNDS[3])
		expect(MAP_DEFAULT_MAX_FIT_ZOOM).toBeLessThanOrEqual(2)
	})
})

describe('basemap theme', () => {
	it('uses a light blue water palette', () => {
		expect(QUIZ_BASEMAP_COLORS_FALLBACK.water).toMatch(/^#[0-9a-f]{6}$/i)
		expect(QUIZ_BASEMAP_COLORS_FALLBACK.waterway).toMatch(/^#[0-9a-f]{6}$/i)
	})

	it('hides label and boundary layers before the first frame', () => {
		const prepared = prepareBasemapStyle(undefined, {
			version: 8,
			sources: {},
			layers: [
				{ id: 'water', type: 'fill', source: 'openmaptiles' },
				{ id: 'boundary_2', type: 'line', source: 'openmaptiles' },
				{
					id: 'place_city',
					type: 'symbol',
					source: 'openmaptiles',
					layout: { 'text-field': ['get', 'name'] }
				}
			]
		})

		expect(prepared.layers[0].layout).toBeUndefined()
		expect(prepared.layers[1].layout).toEqual({ visibility: 'none' })
		expect(prepared.layers[2].layout).toMatchObject({ visibility: 'none' })
	})

	it('uses green only for guessed countries, not active selection', () => {
		expect(QUIZ_MAP_THEME_FALLBACK.guessed.fillColor).toMatch(/^#[0-9a-f]{6}$/i)
		expect(QUIZ_MAP_THEME_FALLBACK.selected.fillColor).not.toBe(
			QUIZ_MAP_THEME_FALLBACK.guessed.fillColor
		)
		expect(QUIZ_MAP_THEME_FALLBACK.wrong.fillColor).not.toBe(
			QUIZ_MAP_THEME_FALLBACK.guessed.fillColor
		)
	})

	it('uses light purple for active country selection', () => {
		expect(QUIZ_MAP_THEME_FALLBACK.selected.fillColor.toLowerCase()).toBe('#c4b5fd')
		expect(QUIZ_MAP_THEME_FALLBACK.selected.weight).toBeGreaterThan(2)
	})

	it('uses a softer purple for hover', () => {
		expect(QUIZ_MAP_THEME_FALLBACK.hover.fillColor.toLowerCase()).toBe('#ddd6fe')
		expect(QUIZ_MAP_THEME_FALLBACK.hover.fillOpacity).toBeLessThan(
			QUIZ_MAP_THEME_FALLBACK.selected.fillOpacity
		)
	})
})
