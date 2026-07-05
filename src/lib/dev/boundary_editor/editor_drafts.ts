import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export type EditableFeature = Feature<Polygon | MultiPolygon>

export function geometriesEqual(
	a: EditableFeature | null | undefined,
	b: EditableFeature | null | undefined
): boolean {
	if (!a || !b) return a === b
	return JSON.stringify(a.geometry) === JSON.stringify(b.geometry)
}

export function replaceFeatureInCollection(
	collection: FeatureCollection,
	entityId: string,
	feature: EditableFeature
): FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: collection.features.map((entry) =>
			entry.properties?.entity_id === entityId ? feature : entry
		)
	}
}

export class EditorDraftStore {
	private drafts = new Map<string, EditableFeature>()

	has(entityId: string): boolean {
		return this.drafts.has(entityId)
	}

	ids(): string[] {
		return [...this.drafts.keys()]
	}

	clear(): void {
		this.drafts.clear()
	}

	delete(entityId: string): void {
		this.drafts.delete(entityId)
	}

	get(entityId: string): EditableFeature | undefined {
		const draft = this.drafts.get(entityId)
		return draft ? cloneEditableFeature(draft) : undefined
	}

	commit(
		entityId: string,
		feature: EditableFeature,
		collection: FeatureCollection
	): FeatureCollection {
		const current = collection.features.find(
			(entry) => entry.properties?.entity_id === entityId
		) as EditableFeature | undefined

		if (geometriesEqual(feature, current)) {
			this.drafts.delete(entityId)
			return collection
		}

		this.drafts.set(entityId, cloneEditableFeature(feature))
		return replaceFeatureInCollection(collection, entityId, feature)
	}
}

function cloneEditableFeature(feature: EditableFeature): EditableFeature {
	return JSON.parse(JSON.stringify(feature))
}
