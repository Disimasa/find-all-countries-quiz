import type { Feature } from 'geojson'
import type { GeoEntity, Locale } from '@domain/entities'
import { BaseMapEra } from '@domain/maps'

export function createStubMapEra(
	entities: GeoEntity[],
	aliases: Record<string, string[]> = {}
): BaseMapEra {
	class StubMapEra extends BaseMapEra {
		readonly id = 'stub'
		readonly year = null
		readonly entityType = 'country' as const

		constructor() {
			super()
			this.entities = new Map(entities.map((entity) => [entity.id, entity]))
			this.geoJson = {
				type: 'FeatureCollection',
				features: entities.map((entity) => ({
					type: 'Feature',
					properties: { ISO_A2: entity.id },
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[0, 0],
								[1, 0],
								[1, 1],
								[0, 0]
							]
						]
					}
				}))
			}
			this.aliasesEn = new Map(
				entities.map((entity) => [entity.id, aliases[entity.id] ?? [entity.names.en]])
			)
			this.aliasesRu = new Map(
				entities.map((entity) => [entity.id, aliases[entity.id] ?? [entity.names.ru]])
			)
		}

		protected getGeoJsonPath(): string {
			return '/stub/geo.json'
		}

		protected getEntitiesPath(): string {
			return '/stub/entities.json'
		}

		protected getAliasesPath(_locale: Locale): string {
			return '/stub/aliases.json'
		}

		protected resolveEntityId(feature: Feature): string | null {
			const iso = feature.properties?.ISO_A2
			return typeof iso === 'string' ? iso : null
		}
	}

	return new StubMapEra()
}

export const STUB_ENTITIES: GeoEntity[] = [
	{ id: 'DE', names: { en: 'Germany', ru: 'Германия' }, flagCode: 'DE' },
	{ id: 'FR', names: { en: 'France', ru: 'Франция' }, flagCode: 'FR' },
	{ id: 'PL', names: { en: 'Poland', ru: 'Польша' }, flagCode: 'PL' }
]
