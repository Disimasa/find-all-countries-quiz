import { describe, expect, it } from 'vitest'
import { neighborFeatures } from '$lib/dev/boundary_editor/era_loader'

describe('neighborFeatures', () => {
	const collection = {
		type: 'FeatureCollection' as const,
		features: [
			{
				type: 'Feature' as const,
				properties: { entity_id: 'near' },
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
			},
			{
				type: 'Feature' as const,
				properties: { entity_id: 'touching' },
				geometry: {
					type: 'Polygon' as const,
					coordinates: [
						[
							[31, 50],
							[32, 50],
							[32, 51],
							[31, 51],
							[31, 50]
						]
					]
				}
			},
			{
				type: 'Feature' as const,
				properties: { entity_id: 'far' },
				geometry: {
					type: 'Polygon' as const,
					coordinates: [
						[
							[60, 50],
							[61, 50],
							[61, 51],
							[60, 51],
							[60, 50]
						]
					]
				}
			}
		]
	}

	it('returns bbox-touching neighbors when buffer is zero', () => {
		const neighbors = neighborFeatures(collection, 'near', 0)
		expect(neighbors.map((feature) => feature.properties?.entity_id)).toEqual(['touching'])
	})

	it('filters neighbors by bbox buffer in meters', () => {
		const neighbors = neighborFeatures(collection, 'near', 50_000)
		expect(neighbors.map((feature) => feature.properties?.entity_id)).toEqual(['touching'])
	})
})
