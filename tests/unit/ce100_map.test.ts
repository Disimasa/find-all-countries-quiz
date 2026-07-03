import { describe, expect, it } from 'vitest'
import { Ce100WorldMap } from '@domain/maps/ce100/map'
import { CE100_ERA_ID } from '@domain/maps/ce100/constants'

describe('Ce100WorldMap', () => {
	const era = new Ce100WorldMap()

	it('has ce100 metadata', () => {
		expect(era.id).toBe(CE100_ERA_ID)
		expect(era.year).toBe(100)
		expect(era.entityType).toBe('polity')
	})

	it('uses entity_id feature property', () => {
		expect(era.getFeatureIdProperty()).toBe('entity_id')
	})

	it('resolves entity_id from features', () => {
		const id = era['resolveEntityId']({
			type: 'Feature',
			properties: { entity_id: 'roman-empire' },
			geometry: { type: 'Polygon', coordinates: [] }
		})
		expect(id).toBe('roman-empire')
	})
})
