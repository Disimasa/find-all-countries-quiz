import { describe, expect, it } from 'vitest'
import type { Position } from '@turf/turf'
import {
	clipPolygonToNeighbors,
	clampVertexToBorders,
	clampVerticesToBorders,
	editedPartIndicesFromCoordPaths,
	isEditableGeometryAllowed,
	overlapsNeighbors,
	vertexInsideNeighbor,
	verticesInWorldBounds
} from '$lib/dev/boundary_editor/geometry_constraints'

const left = {
	type: 'Feature' as const,
	properties: { entity_id: 'left' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[30, 50],
				[31, 50],
				[31, 51],
				[30, 51],
				[30, 50]
			]
		]
	}
}

const right = {
	type: 'Feature' as const,
	properties: { entity_id: 'right' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[33, 50],
				[33.5, 50],
				[33.5, 51],
				[33, 51],
				[33, 50]
			]
		]
	}
}

const collection = {
	type: 'FeatureCollection' as const,
	features: [left, right]
}

describe('geometry_constraints', () => {
	it('allows unchanged geometry', () => {
		expect(isEditableGeometryAllowed(left, collection, 'left')).toBe(true)
	})

	it('rejects a vertex moved inside a neighbor', () => {
		const moved = {
			...left,
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[30, 50],
						[33.25, 50.5],
						[31, 51],
						[30, 51],
						[30, 50]
					]
				]
			}
		}

		expect(isEditableGeometryAllowed(moved, collection, 'left')).toBe(false)
	})

	it('rejects overlap even when vertices stay outside', () => {
		const overlap = {
			...left,
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[30, 50],
						[33.4, 50],
						[33.4, 51],
						[30, 51],
						[30, 50]
					]
				]
			}
		}

		expect(isEditableGeometryAllowed(overlap, collection, 'left')).toBe(false)
	})

	it('detects points inside neighbors', () => {
		expect(vertexInsideNeighbor([33.2, 50.5], [right])).toBe(true)
		expect(vertexInsideNeighbor([30.5, 50.5], [right])).toBe(false)
	})

	it('rejects vertices outside world bounds', () => {
		const far = {
			...left,
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[30, 50],
						[31, 50],
						[31, 86],
						[30, 51],
						[30, 50]
					]
				]
			}
		}

		expect(verticesInWorldBounds(far)).toBe(false)
	})

	it('clamps a vertex onto the nearest neighbor border', () => {
		const from = [33.1, 50.5] as const
		const to = [33.25, 50.5] as const
		const clamped = clampVertexToBorders([...from], [...to], [right])
		expect(vertexInsideNeighbor(clamped, [right], true)).toBe(false)
		expect(clamped[0]).toBeGreaterThanOrEqual(33)
		expect(clamped[0]).toBeLessThanOrEqual(33.5)
	})

	it('keeps free-space vertices unchanged', () => {
		const from = [30.4, 50.5] as const
		const to = [30.5, 50.5] as const
		expect(clampVertexToBorders([...from], [...to], [right])).toEqual([...to])
	})

	it('moves a multi-vertex selection as one rigid piece', () => {
		const fromA: Position = [30.2, 50.3]
		const fromB: Position = [30.2, 50.7]
		const delta: Position = [0.1, 0.05]
		const toA: Position = [fromA[0] + delta[0], fromA[1] + delta[1]]
		const toB: Position = [fromB[0] + delta[0], fromB[1] + delta[1]]

		const group = clampVerticesToBorders(
			[
				{ from: fromA, to: toA },
				{ from: fromB, to: toB }
			],
			[right]
		)

		expect(group[0]).toEqual(toA)
		expect(group[1]).toEqual(toB)
		expect(group[1][1] - group[0][1]).toBeCloseTo(fromB[1] - fromA[1], 5)
	})

	it('does not stop the group when only the leading vertex hits a neighbor', () => {
		const fromA: Position = [32.8, 50.4]
		const fromB: Position = [32.0, 50.6]
		const toA: Position = [33.4, 50.45]
		const toB: Position = [33.4, 50.55]

		const group = clampVerticesToBorders(
			[
				{ from: fromA, to: toA },
				{ from: fromB, to: toB }
			],
			[right]
		)

		expect(group[0]).toEqual(toA)
		expect(group[1]).toEqual(toB)
	})

	it('slides multiple border vertices together without collapsing', () => {
		const fromA: Position = [33, 50.3]
		const fromB: Position = [33, 50.7]
		const toA: Position = [33.05, 50.5]
		const toB: Position = [33.05, 50.9]

		const group = clampVerticesToBorders(
			[
				{ from: fromA, to: toA },
				{ from: fromB, to: toB }
			],
			[right]
		)

		expect(group[1][1] - group[0][1]).toBeCloseTo(0.4, 1)
	})

	it('stops at a corner where two neighbor borders meet', () => {
		const south = {
			type: 'Feature' as const,
			properties: { entity_id: 'south' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[32, 50],
						[33, 50],
						[33, 51],
						[32, 51],
						[32, 50]
					]
				]
			}
		}
		const east = {
			type: 'Feature' as const,
			properties: { entity_id: 'east' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[33, 50],
						[34, 50],
						[34, 51],
						[33, 51],
						[33, 50]
					]
				]
			}
		}
		const corner: Position = [33, 51]
		const from: Position = [32.99, 51]
		const to: Position = [33.3, 51]

		const clamped = clampVertexToBorders(from, to, [south, east])
		expect(clamped[0]).toBeCloseTo(corner[0], 5)
		expect(clamped[1]).toBeCloseTo(corner[1], 5)
		expect(vertexInsideNeighbor(clamped, [south, east], true)).toBe(false)
	})

	it('stops at a corner before entering the second neighbor', () => {
		const south = {
			type: 'Feature' as const,
			properties: { entity_id: 'south' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[32, 50],
						[33, 50],
						[33, 51],
						[32, 51],
						[32, 50]
					]
				]
			}
		}
		const east = {
			type: 'Feature' as const,
			properties: { entity_id: 'east' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[33, 50],
						[34, 50],
						[34, 51],
						[33, 51],
						[33, 50]
					]
				]
			}
		}
		const from: Position = [32.99, 51]
		const to: Position = [33.4, 50.8]

		const clamped = clampVertexToBorders(from, to, [south, east])
		expect(clamped[0]).toBeCloseTo(33, 5)
		expect(clamped[1]).toBeCloseTo(51, 2)
	})

	it('clips overlap against neighbors on release', () => {
		const overlap = {
			...left,
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[30, 50],
						[33.4, 50],
						[33.4, 51],
						[30, 51],
						[30, 50]
					]
				]
			}
		}

		expect(overlapsNeighbors(overlap, [right])).toBe(true)

		const clipped = clipPolygonToNeighbors(overlap, collection, 'left')
		expect(overlapsNeighbors(clipped, [right])).toBe(false)
		expect(isEditableGeometryAllowed(clipped, collection, 'left')).toBe(true)
	})

	it('leaves geometry unchanged when there is no overlap', () => {
		const clipped = clipPolygonToNeighbors(left, collection, 'left')
		expect(clipped.geometry).toEqual(left.geometry)
	})

	it('clips only edited multipolygon parts', () => {
		const islandNorth = {
			type: 'Feature' as const,
			properties: { entity_id: 'islands' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[0, 2],
						[1, 2],
						[1, 3],
						[0, 3],
						[0, 2]
					]
				]
			}
		}
		const islandSouthOverlap = {
			type: 'Feature' as const,
			properties: { entity_id: 'islands' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[0, 0],
						[2.5, 0],
						[2.5, 1],
						[0, 1],
						[0, 0]
					]
				]
			}
		}
		const islands = {
			type: 'Feature' as const,
			properties: { entity_id: 'islands' },
			geometry: {
				type: 'MultiPolygon' as const,
				coordinates: [
					islandNorth.geometry.coordinates,
					islandSouthOverlap.geometry.coordinates
				]
			}
		}
		const neighbor = {
			type: 'Feature' as const,
			properties: { entity_id: 'neighbor' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[2, 0],
						[3, 0],
						[3, 1],
						[2, 1],
						[2, 0]
					]
				]
			}
		}
		const islandCollection = {
			type: 'FeatureCollection' as const,
			features: [islands, neighbor]
		}

		const clipped = clipPolygonToNeighbors(islands, islandCollection, 'islands', {
			editedPartIndices: [1]
		})

		expect(clipped.geometry.type).toBe('MultiPolygon')
		if (clipped.geometry.type !== 'MultiPolygon') return

		expect(clipped.geometry.coordinates[0]).toEqual(islandNorth.geometry.coordinates)

		const southPart = {
			type: 'Feature' as const,
			properties: {},
			geometry: { type: 'Polygon' as const, coordinates: clipped.geometry.coordinates[1] }
		}
		expect(overlapsNeighbors(southPart, [neighbor])).toBe(false)
	})

	it('maps draw coord paths to multipolygon part indices', () => {
		const geometry = {
			type: 'MultiPolygon' as const,
			coordinates: [
				[
					[
						[0, 0],
						[1, 0],
						[1, 1],
						[0, 1],
						[0, 0]
					]
				],
				[
					[
						[2, 0],
						[3, 0],
						[3, 1],
						[2, 1],
						[2, 0]
					]
				]
			]
		}
		expect(editedPartIndicesFromCoordPaths(['1.0.2', '1.0.3'], geometry)).toEqual([1])
		expect(editedPartIndicesFromCoordPaths(['0.0.1'], geometry)).toEqual([0])
	})

	it('stops before a gap between two neighbors when sliding past a corner', () => {
		const west = {
			type: 'Feature' as const,
			properties: { entity_id: 'west' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[32, 50],
						[33, 50],
						[33, 52],
						[32, 52],
						[32, 50]
					]
				]
			}
		}
		const top = {
			type: 'Feature' as const,
			properties: { entity_id: 'top' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[33, 51],
						[34, 51],
						[34, 52],
						[33, 52],
						[33, 51]
					]
				]
			}
		}
		const bottom = {
			type: 'Feature' as const,
			properties: { entity_id: 'bottom' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[33, 50],
						[34, 50],
						[34, 51],
						[33, 51],
						[33, 50]
					]
				]
			}
		}

		const from: Position = [32.95, 52]
		const to: Position = [33.35, 51.5]
		const clamped = clampVertexToBorders(from, to, [west, top, bottom])

		expect(clamped[0]).toBeCloseTo(33, 5)
		expect(clamped[1]).toBeCloseTo(52, 5)
		expect(vertexInsideNeighbor(clamped, [top, bottom], true)).toBe(false)
	})
})
