import type { Feature, FeatureCollection } from 'geojson'
import type {
	EntityMetaRaw,
	EntityType,
	GeoEntity,
	Locale
} from '@domain/entities'
import type { GeoJsonLoader } from '@infrastructure/data/geo_json_loader'
import { getFlagEmoji as flagEmojiFromCode } from '@shared/flag_emoji'

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

	getFeatureIdProperty(): string {
		return 'entity_id'
	}

	protected eraDataPath(file: string): string {
		return `/data/eras/${this.id}/${file}`
	}

	protected getGeoJsonPath(): string {
		return this.eraDataPath('boundaries.geojson')
	}

	protected getEntitiesPath(): string {
		return this.eraDataPath('entities.json')
	}

	protected getAliasesPath(locale: Locale): string {
		return this.eraDataPath(`aliases.${locale}.json`)
	}

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
				flagCode: item.flagCode,
				flagAsset: item.flagAsset
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

	isInitialized(): boolean {
		return this.geoJson !== null
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
		const emoji = flagEmojiFromCode(id, code)
		return emoji === '🏳️' ? null : emoji
	}

	getEntityIdFromFeature(feature: Feature): string | null {
		const fromProps = this.resolveEntityId(feature)
		if (fromProps) return fromProps
		const rawId = feature.id
		if (typeof rawId === 'string' && rawId) return rawId
		if (typeof rawId === 'number') return String(rawId)
		return null
	}
}
