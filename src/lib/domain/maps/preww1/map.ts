import type { Feature } from 'geojson'
import { BaseMapEra } from '../base.ts'
import { PREWW1_ERA_ID, PREWW1_YEAR } from './constants.ts'

export class PreWW1WorldMap extends BaseMapEra {
	readonly id = PREWW1_ERA_ID
	readonly year = PREWW1_YEAR
	readonly entityType = 'polity' as const

	protected resolveEntityId(feature: Feature): string | null {
		const id = feature.properties?.entity_id
		if (typeof id !== 'string' || !id) return null
		return id
	}
}
