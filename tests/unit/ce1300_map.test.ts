import { describe, expect, it } from 'vitest'

import { Ce1300WorldMap } from '@domain/maps/ce1300/map'

import { CE1300_ERA_ID } from '@domain/maps/ce1300/constants'



describe('Ce1300WorldMap', () => {

	const era = new Ce1300WorldMap()



	it('has ce1300 metadata', () => {

		expect(era.id).toBe(CE1300_ERA_ID)

		expect(era.year).toBe(1300)

		expect(era.entityType).toBe('polity')

	})

})

