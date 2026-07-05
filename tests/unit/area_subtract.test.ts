import { area } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import { subtractAreaFromEntity } from '$lib/dev/boundary_editor/area_subtract'

const target = {
	type: 'Feature' as const,
	properties: { entity_id: 'target' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[30, 50],
				[32, 50],
				[32, 51],
				[30, 51],
				[30, 50]
			]
		]
	}
}

const bite = {
	type: 'Feature' as const,
	properties: { entity_id: 'bite' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[31, 50.2],
				[31.8, 50.2],
				[31.8, 50.8],
				[31, 50.8],
				[31, 50.2]
			]
		]
	}
}

const far = {
	type: 'Feature' as const,
	properties: { entity_id: 'far' },
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

describe('area_subtract', () => {
	it('removes overlapping area', () => {
		const result = subtractAreaFromEntity(target, bite)

		expect(result.changed).toBe(true)
		expect(result.areaAfterSqM).toBeLessThan(result.areaBeforeSqM)
		expect(area(result.feature)).toBeCloseTo(result.areaAfterSqM, 0)
	})

	it('leaves geometry unchanged when areas do not intersect', () => {
		const result = subtractAreaFromEntity(target, far)

		expect(result.changed).toBe(false)
		expect(result.feature.geometry).toEqual(target.geometry)
	})

	it('cuts a hole when subtractor lies inside target', () => {
		const hole = {
			...bite,
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[30.4, 50.3],
						[30.7, 50.3],
						[30.7, 50.7],
						[30.4, 50.7],
						[30.4, 50.3]
					]
				]
			}
		}

		const result = subtractAreaFromEntity(target, hole)

		expect(result.changed).toBe(true)
		expect(result.areaAfterSqM).toBeLessThan(result.areaBeforeSqM)
		if (result.feature.geometry.type === 'Polygon') {
			expect(result.feature.geometry.coordinates.length).toBeGreaterThan(1)
		}
	})
})
