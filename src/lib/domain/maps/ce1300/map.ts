import type { Feature } from 'geojson'

import { BaseMapEra } from '../base.ts'

import { CE1300_ERA_ID, CE1300_YEAR } from './constants.ts'



export class Ce1300WorldMap extends BaseMapEra {

	readonly id = CE1300_ERA_ID

	readonly year = CE1300_YEAR

	readonly entityType = 'polity' as const



	protected resolveEntityId(feature: Feature): string | null {

		const id = feature.properties?.entity_id

		if (typeof id !== 'string' || !id) return null

		return id

	}

}

