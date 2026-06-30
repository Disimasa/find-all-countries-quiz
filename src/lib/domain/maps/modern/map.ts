import type { Feature } from 'geojson'
import { BaseMapEra } from '../base.ts'
import { MODERN_ERA_ID } from './constants.ts'

export class ModernWorldMap extends BaseMapEra {
	readonly id = MODERN_ERA_ID
	readonly year = null
	readonly entityType = 'country' as const

	protected getGeoJsonPath(): string {
		return '/data/eras/modern/boundaries.geojson'
	}

	protected getEntitiesPath(): string {
		return '/data/eras/modern/entities.json'
	}

	protected getAliasesPath(locale: 'en' | 'ru'): string {
		return `/data/eras/modern/aliases.${locale}.json`
	}

	protected resolveEntityId(feature: Feature): string | null {
		const iso = feature.properties?.ISO_A2
		if (typeof iso !== 'string' || !iso || iso === '-99') return null
		return iso
	}
}
