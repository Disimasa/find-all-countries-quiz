import { describe, expect, it } from 'vitest'
import { buildCountryLabelPoints } from '@infrastructure/map/country_labels'
import { createStubMapEra, STUB_ENTITIES } from './helpers/stub_map_era'

describe('buildCountryLabelPoints', () => {
	it('builds a label point per entity with localized names', () => {
		const era = createStubMapEra(STUB_ENTITIES)
		const en = buildCountryLabelPoints(era, 'en')
		const ru = buildCountryLabelPoints(era, 'ru')

		expect(en.features).toHaveLength(STUB_ENTITIES.length)
		expect(en.features[0]?.properties).toEqual({ id: 'DE', name: 'Germany' })
		expect(ru.features.find((feature) => feature.properties?.id === 'FR')?.properties?.name).toBe(
			'Франция'
		)
		expect(en.features[0]?.geometry.type).toBe('Point')
	})
})
