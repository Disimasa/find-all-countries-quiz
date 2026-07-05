import type { FeatureCollection, Polygon, MultiPolygon, Feature } from 'geojson'
import { bbox } from '@turf/turf'
import { featureCentroid } from '@infrastructure/map/country_centroid'

type AreaFeature = Feature<Polygon | MultiPolygon>

export type EditorEntity = {
	id: string
	nameEn: string
	nameRu: string
}

export type RevisionMeta = {
	revisions: string[]
	latest: string | null
}

export async function fetchRevisionMeta(eraId: string): Promise<RevisionMeta> {
	const response = await fetch(`/dev/boundaries?era=${encodeURIComponent(eraId)}`)
	if (!response.ok) throw new Error(`Failed to list revisions: ${response.status}`)
	const data = (await response.json()) as RevisionMeta & { eraId?: string }
	return { revisions: data.revisions, latest: data.latest }
}

export type RevisionLoad = 'latest' | 'base' | string

export async function loadMergedCollection(
	eraId: string,
	source: RevisionLoad = 'latest'
): Promise<FeatureCollection> {
	if (source === 'base') {
		return fetch(`/data/eras/${eraId}/boundaries.geojson`).then((response) => {
			if (!response.ok) throw new Error(`Failed to load boundaries: ${response.status}`)
			return response.json() as Promise<FeatureCollection>
		})
	}

	const meta = await fetchRevisionMeta(eraId)
	const target = source === 'latest' ? meta.latest : source

	if (target) {
		return fetch(`/data/eras/${eraId}/revisions/${encodeURIComponent(target)}.geojson`).then(
			(response) => {
				if (!response.ok) {
					throw new Error(`Failed to load revision ${target}: ${response.status}`)
				}
				return response.json() as Promise<FeatureCollection>
			}
		)
	}

	return fetch(`/data/eras/${eraId}/boundaries.geojson`).then((response) => {
		if (!response.ok) throw new Error(`Failed to load boundaries: ${response.status}`)
		return response.json() as Promise<FeatureCollection>
	})
}

export function buildEditorEraLabelsCollection(
	collection: FeatureCollection,
	entities: EditorEntity[]
): FeatureCollection {
	const labelById = new Map(entities.map((entity) => [entity.id, entity.nameRu || entity.nameEn]))
	const features = []

	for (const feature of collection.features) {
		const entityId = feature.properties?.entity_id
		if (typeof entityId !== 'string') continue

		const label = labelById.get(entityId)
		if (!label) continue

		const coordinates = featureCentroid(feature)
		if (!coordinates) continue

		features.push({
			type: 'Feature',
			properties: { entity_id: entityId, label },
			geometry: { type: 'Point', coordinates }
		})
	}

	return { type: 'FeatureCollection', features }
}

export function listEditorEntities(
	entities: EditorEntity[],
	collection: FeatureCollection,
	rusOnly: boolean
): EditorEntity[] {
	const ids = new Set(
		collection.features
			.map((f) => f.properties?.entity_id)
			.filter((id): id is string => typeof id === 'string')
	)

	return entities
		.filter((entity) => ids.has(entity.id))
		.filter((entity) => !rusOnly || isRusEntity(entity.id, collection))
		.sort((a, b) => a.nameEn.localeCompare(b.nameEn))
}

const RUS_BBOX: [number, number, number, number] = [22, 45, 50, 62]

function isRusEntity(entityId: string, collection: FeatureCollection): boolean {
	const feature = collection.features.find((f) => f.properties?.entity_id === entityId)
	if (!feature?.geometry) return false
	const [west, south, east, north] = bbox(feature)
	return east >= RUS_BBOX[0] && west <= RUS_BBOX[2] && north >= RUS_BBOX[1] && south <= RUS_BBOX[3]
}

export function getAreaFeature(
	collection: FeatureCollection,
	entityId: string
): AreaFeature | null {
	const feature = collection.features.find((f) => f.properties?.entity_id === entityId)
	if (!feature?.geometry) return null
	if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') return null
	return feature as AreaFeature
}

export function neighborFeatures(
	collection: FeatureCollection,
	entityId: string,
	bufferMeters = 0
): AreaFeature[] {
	const target = collection.features.find((f) => f.properties?.entity_id === entityId)
	if (!target?.geometry) return []

	const [west, south, east, north] = bbox(target)
	const latMid = (south + north) / 2
	const metersPerDegree = 111_320 * Math.cos((latMid * Math.PI) / 180)
	const bufferLng = bufferMeters / Math.max(metersPerDegree, 1)
	const bufferLat = bufferMeters / 111_320

	return collection.features.filter((feature) => {
		if (feature.properties?.entity_id === entityId) return false
		if (feature.geometry?.type !== 'Polygon' && feature.geometry?.type !== 'MultiPolygon') {
			return false
		}

		const [featureWest, featureSouth, featureEast, featureNorth] = bbox(feature)
		return (
			featureEast >= west - bufferLng &&
			featureWest <= east + bufferLng &&
			featureNorth >= south - bufferLat &&
			featureSouth <= north + bufferLat
		)
	}) as AreaFeature[]
}

export function featureBounds(feature: Feature): [number, number, number, number] {
	return bbox(feature) as [number, number, number, number]
}
