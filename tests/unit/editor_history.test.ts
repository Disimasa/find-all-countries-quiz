import { describe, expect, it } from 'vitest'
import {
	cloneEditableFeature,
	GeometryHistory,
	geometryEquals,
	type EditableFeature
} from '$lib/dev/boundary_editor/editor_history'

const square = (offset: number): EditableFeature => ({
	type: 'Feature',
	properties: { entity_id: 'test' },
	geometry: {
		type: 'Polygon',
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

describe('editor_history', () => {
	it('push and pop restore previous geometry', () => {
		const history = new GeometryHistory()
		const before = square(0)
		const after = square(10)

		history.push(before)
		history.push(after)

		expect(history.pop()?.geometry).toEqual(after.geometry)
		expect(history.pop()?.geometry).toEqual(before.geometry)
		expect(history.pop()).toBeNull()
	})

	it('skips duplicate consecutive snapshots', () => {
		const history = new GeometryHistory()
		const feature = square(0)

		history.push(feature)
		history.push(cloneEditableFeature(feature))

		expect(history.size).toBe(1)
	})

	it('drops oldest entries when max size is exceeded', () => {
		const history = new GeometryHistory(2)

		history.push(square(0))
		history.push(square(1))
		history.push(square(2))

		expect(history.size).toBe(2)
		expect(history.pop()?.geometry).toEqual(square(2).geometry)
		expect(history.pop()?.geometry).toEqual(square(1).geometry)
	})

	it('geometryEquals compares only geometry', () => {
		const a = square(0)
		const b = {
			...cloneEditableFeature(a),
			properties: { entity_id: 'other' }
		}

		expect(geometryEquals(a, b)).toBe(true)
	})
})
