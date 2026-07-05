import { describe, expect, it } from 'vitest'
import { buildEditorEraLabelsCollection } from '$lib/dev/boundary_editor/era_loader'

describe('buildEditorEraLabelsCollection', () => {
	it('uses era Russian names at polygon centroids', () => {
		const collection = {
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					properties: { entity_id: 'novgorod' },
					geometry: {
						type: 'Polygon' as const,
						coordinates: [
							[
								[30, 58],
								[32, 58],
								[32, 60],
								[30, 60],
								[30, 58]
							]
						]
					}
				}
			]
		}
		const entities = [
			{
				id: 'novgorod',
				nameEn: 'Novgorod',
				nameRu: 'Новгород'
			}
		]

		const labels = buildEditorEraLabelsCollection(collection, entities)

		expect(labels.features).toHaveLength(1)
		expect(labels.features[0].properties?.label).toBe('Новгород')
		expect(labels.features[0].geometry.coordinates).toEqual([31, 59])
	})

	it('skips entities not in the filtered list', () => {
		const collection = {
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					properties: { entity_id: 'poland' },
					geometry: {
						type: 'Polygon' as const,
						coordinates: [
							[
								[18, 50],
								[20, 50],
								[20, 52],
								[18, 52],
								[18, 50]
							]
						]
					}
				}
			]
		}

		const labels = buildEditorEraLabelsCollection(collection, [])

		expect(labels.features).toHaveLength(0)
	})
})
