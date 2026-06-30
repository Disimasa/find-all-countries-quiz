import type { Feature, FeatureCollection } from 'geojson'
import type {
	EntityMetaRaw,
	EntityVisualState,
	EntityType,
	GeoEntity,
	Locale,
	PolygonStyle
} from '@domain/entities'
import { MAP_STYLE } from './constants.ts'
import type { GeoJsonLoader } from '@infrastructure/data/geo_json_loader'

export abstract class BaseMapEra {
	abstract readonly id: string
	abstract readonly year: number | null
	abstract readonly entityType: EntityType

	protected entities = new Map<string, GeoEntity>()
	protected geoJson: FeatureCollection | null = null
	protected aliasesEn = new Map<string, string[]>()
	protected aliasesRu = new Map<string, string[]>()

	async initialize(loader: GeoJsonLoader): Promise<void> {
		this.geoJson = await loader.load(this.getGeoJsonPath())
		await this.loadAliases(loader)
		const raw = await this.loadEntityMetadata(loader)
		this.entities = this.buildEntityIndex(raw)
		if (!this.geoJson) throw new Error('GeoJSON failed to load')
		this.geoJson = this.filterGeoJson(this.geoJson)
	}

	protected abstract getGeoJsonPath(): string
	protected abstract getEntitiesPath(): string
	protected abstract getAliasesPath(locale: Locale): string

	protected abstract resolveEntityId(feature: Feature): string | null

	protected async loadEntityMetadata(loader: GeoJsonLoader): Promise<EntityMetaRaw[]> {
		return loader.loadJson<EntityMetaRaw[]>(this.getEntitiesPath())
	}

	protected async loadAliases(loader: GeoJsonLoader): Promise<void> {
		const en = await loader.loadJson<Record<string, string[]>>(this.getAliasesPath('en'))
		const ru = await loader.loadJson<Record<string, string[]>>(this.getAliasesPath('ru'))
		this.aliasesEn = new Map(Object.entries(en))
		this.aliasesRu = new Map(Object.entries(ru))
	}

	protected buildEntityIndex(raw: EntityMetaRaw[]): Map<string, GeoEntity> {
		const map = new Map<string, GeoEntity>()
		for (const item of raw) {
			map.set(item.id, {
				id: item.id,
				names: { en: item.nameEn, ru: item.nameRu },
				region: item.region,
				flagCode: item.flagCode
			})
		}
		return map
	}

	protected filterGeoJson(collection: FeatureCollection): FeatureCollection {
		const ids = new Set(this.entities.keys())
		return {
			type: 'FeatureCollection',
			features: collection.features.filter((f) => {
				const id = this.resolveEntityId(f)
				return id !== null && ids.has(id)
			})
		}
	}

	getGeoJson(): FeatureCollection {
		if (!this.geoJson) throw new Error('Map era not initialized')
		return this.geoJson
	}

	getEntity(id: string): GeoEntity | undefined {
		return this.entities.get(id)
	}

	getAllEntities(): GeoEntity[] {
		return [...this.entities.values()]
	}

	getDisplayName(id: string, locale: Locale): string {
		return this.entities.get(id)?.names[locale] ?? id
	}

	getAliases(id: string, locale: Locale): string[] {
		const map = locale === 'ru' ? this.aliasesRu : this.aliasesEn
		return map.get(id) ?? []
	}

	getFlagEmoji(id: string): string | null {
		const code = this.entities.get(id)?.flagCode
		if (!code || code.length !== 2) return null
		const points = [...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
		return String.fromCodePoint(...points)
	}

	getFeatureStyle(state: EntityVisualState): PolygonStyle {
		return { ...MAP_STYLE[state] }
	}

	getEntityIdFromFeature(feature: Feature): string | null {
		return this.resolveEntityId(feature)
	}
}
