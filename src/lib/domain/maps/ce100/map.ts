import type { Feature } from 'geojson'
import { BaseMapEra } from '../base.ts'
import { CE100_ERA_ID, CE100_YEAR } from './constants.ts'

export class Ce100WorldMap extends BaseMapEra {
	readonly id = CE100_ERA_ID
	readonly year = CE100_YEAR
	readonly entityType = 'polity' as const

	protected resolveEntityId(feature: Feature): string | null {
		const id = feature.properties?.entity_id
		if (typeof id !== 'string' || !id) return null
		return id
	}
}
