import type { Feature } from 'geojson'
import { BaseMapEra } from '../base.ts'
import { MODERN_ERA_ID } from './constants.ts'

export class ModernWorldMap extends BaseMapEra {
	readonly id = MODERN_ERA_ID
	readonly year = null
	readonly entityType = 'country' as const

	getFeatureIdProperty(): string {
		return 'ISO_A2'
	}

	protected resolveEntityId(feature: Feature): string | null {
		const iso = feature.properties?.ISO_A2
		if (typeof iso !== 'string' || !iso || iso === '-99') return null
		return iso
	}
}
