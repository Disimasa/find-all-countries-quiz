import { describe, expect, it } from 'vitest'
import { listEditorObstacles } from '$lib/dev/boundary_editor/geometry_constraints'
import { expandObstacleBounds, isMarineWaterClass } from '$lib/dev/boundary_editor/map_water_obstacles'

const left = {
	type: 'Feature' as const,
	properties: { entity_id: 'left' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[30, 50],
				[31, 50],
				[31, 51],
				[30, 51],
				[30, 50]
			]
		]
	}
}

const right = {
	type: 'Feature' as const,
	properties: { entity_id: 'right' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[33, 50],
				[34, 50],
				[34, 51],
				[33, 51],
				[33, 50]
			]
		]
	}
}

const collection = {
	type: 'FeatureCollection' as const,
	features: [left, right]
}

describe('map_water_obstacles integration', () => {
	it('expands bounds for nearby water lookup', () => {
		expect(expandObstacleBounds([10, 20, 11, 21], 2)).toEqual([8, 18, 13, 23])
	})

	it('listEditorObstacles without map returns only country neighbors', () => {
		const obstacles = listEditorObstacles(collection, 'left')
		expect(obstacles).toHaveLength(1)
		expect(obstacles[0].properties?.entity_id).toBe('right')
	})

	it('listEditorObstacles merges water features from the basemap', () => {
		const water = {
			type: 'Feature' as const,
			properties: { class: 'ocean' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[29, 49],
						[32, 49],
						[32, 52],
						[29, 52],
						[29, 49]
					]
				]
			}
		}

		const map = {
			isStyleLoaded: () => true,
			getZoom: () => 5,
			project: (lngLat: [number, number]) => ({ x: lngLat[0] * 100, y: lngLat[1] * 100 }),
			queryRenderedFeatures: () => [water]
		}

		const obstacles = listEditorObstacles(collection, 'left', {
			map: map as never,
			bounds: [30, 50, 31, 51]
		})

		expect(obstacles).toHaveLength(1)
		expect(obstacles[0].properties?.obstacle_kind).toBe('water')
	})

	it('ignores lakes and rivers from the basemap', () => {
		const lake = {
			type: 'Feature' as const,
			properties: { class: 'lake' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[29, 49],
						[32, 49],
						[32, 52],
						[29, 52],
						[29, 49]
					]
				]
			}
		}

		const map = {
			isStyleLoaded: () => true,
			getZoom: () => 5,
			project: (lngLat: [number, number]) => ({ x: lngLat[0] * 100, y: lngLat[1] * 100 }),
			queryRenderedFeatures: () => [lake]
		}

		const obstacles = listEditorObstacles(collection, 'left', {
			map: map as never,
			bounds: [30, 50, 31, 51]
		})

		expect(obstacles).toHaveLength(0)
		expect(isMarineWaterClass('ocean')).toBe(true)
		expect(isMarineWaterClass('lake')).toBe(false)
		expect(isMarineWaterClass('river')).toBe(false)
	})
})
