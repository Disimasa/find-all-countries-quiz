import { describe, expect, it } from 'vitest'
import { PreWW1WorldMap } from '@domain/maps/preww1/map'
import { PREWW1_ERA_ID } from '@domain/maps/preww1/constants'

describe('PreWW1WorldMap', () => {
	const era = new PreWW1WorldMap()

	it('has preww1 metadata', () => {
		expect(era.id).toBe(PREWW1_ERA_ID)
		expect(era.year).toBe(1914)
		expect(era.entityType).toBe('polity')
	})

	it('uses entity_id feature property', () => {
		expect(era.getFeatureIdProperty()).toBe('entity_id')
	})

	it('resolves entity_id from features', () => {
		const id = era['resolveEntityId']({
			type: 'Feature',
			properties: { entity_id: 'germany-prussia' },
			geometry: { type: 'Polygon', coordinates: [] }
		})
		expect(id).toBe('germany-prussia')
	})

	it('falls back to feature.id when properties are missing', () => {
		const id = era.getEntityIdFromFeature({
			type: 'Feature',
			id: 'germany-prussia',
			properties: {},
			geometry: { type: 'Polygon', coordinates: [] }
		})
		expect(id).toBe('germany-prussia')
	})
})
