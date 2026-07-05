import { describe, expect, it } from 'vitest'
import {
	EditorDraftStore,
	geometriesEqual,
	replaceFeatureInCollection
} from '$lib/dev/boundary_editor/editor_drafts'

const square = (id: string, offset: number) => ({
	type: 'Feature' as const,
	properties: { entity_id: id },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[offset, offset],
				[offset + 1, offset],
				[offset + 1, offset + 1],
				[offset, offset + 1],
				[offset, offset]
			]
		]
	}
})

describe('editor_drafts', () => {
	it('replaces a feature in the collection by entity id', () => {
		const collection = {
			type: 'FeatureCollection' as const,
			features: [square('a', 0), square('b', 10)]
		}
		const updated = square('a', 5)
		const next = replaceFeatureInCollection(collection, 'a', updated)

		expect(next.features[0].geometry).toEqual(updated.geometry)
		expect(next.features[1]).toEqual(collection.features[1])
	})

	it('stores drafts and updates the working collection on commit', () => {
		const store = new EditorDraftStore()
		const collection = {
			type: 'FeatureCollection' as const,
			features: [square('a', 0)]
		}
		const edited = square('a', 3)

		const next = store.commit('a', edited, collection)

		expect(store.has('a')).toBe(true)
		expect(next.features[0].geometry).toEqual(edited.geometry)
		expect(store.get('a')?.geometry).toEqual(edited.geometry)
	})

	it('drops draft when geometry matches the collection', () => {
		const store = new EditorDraftStore()
		const collection = {
			type: 'FeatureCollection' as const,
			features: [square('a', 0)]
		}

		store.commit('a', square('a', 1), collection)
		const next = store.commit('a', square('a', 1), replaceFeatureInCollection(collection, 'a', square('a', 1)))

		expect(store.has('a')).toBe(false)
		expect(next).toEqual(replaceFeatureInCollection(collection, 'a', square('a', 1)))
	})

	it('compares geometry only', () => {
		const a = square('a', 0)
		const b = { ...square('b', 0), properties: { entity_id: 'b' } }

		expect(geometriesEqual(a, b)).toBe(true)
	})
})
