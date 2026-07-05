import { distance } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import { countMovedVertices, snapFeatureToNeighbors } from '../../src/lib/dev/boundary_editor/snap_geometry'

describe('snapFeatureToNeighbors', () => {
	it('snaps a vertex to a nearby neighbor vertex', () => {
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
						[31.02, 50],
						[32, 50],
						[32, 51],
						[31.02, 51],
						[31.02, 50]
					]
				]
			}
		}

		const snapped = snapFeatureToNeighbors(right, [left], 5000)
		const sharedLeft = snapped.geometry.coordinates[0][0]
		const sharedRight = left.geometry.coordinates[0][1]

		expect(distance(sharedLeft, sharedRight, { units: 'meters' })).toBeLessThan(50)
	})

	it('pulls an edge toward a neighbor boundary line', () => {
		const a = {
			type: 'Feature' as const,
			properties: { entity_id: 'a' },
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
		const b = {
			type: 'Feature' as const,
			properties: { entity_id: 'b' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[31.02, 50],
						[32, 50],
						[32, 51],
						[31.02, 51],
						[31.02, 50]
					]
				]
			}
		}

		const snapped = snapFeatureToNeighbors(b, [a], 8000)
		const shared = snapped.geometry.coordinates[0][0]
		const target = a.geometry.coordinates[0][1]

		expect(distance(shared, target, { units: 'meters' })).toBeLessThan(100)
	})

	it('snaps against MultiPolygon neighbors', () => {
		const neighbor = {
			type: 'Feature' as const,
			properties: { entity_id: 'neighbor' },
			geometry: {
				type: 'MultiPolygon' as const,
				coordinates: [
					[
						[
							[30, 50],
							[31, 50],
							[31, 51],
							[30, 51],
							[30, 50]
						]
					]
				]
			}
		}
		const target = {
			type: 'Feature' as const,
			properties: { entity_id: 'target' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[31.02, 50],
						[32, 50],
						[32, 51],
						[31.02, 51],
						[31.02, 50]
					]
				]
			}
		}

		expect(() => snapFeatureToNeighbors(target, [neighbor], 5000)).not.toThrow()

		const snapped = snapFeatureToNeighbors(target, [neighbor], 5000)
		const shared = snapped.geometry.coordinates[0][0]
		const edgePoint = neighbor.geometry.coordinates[0][0][1]

		expect(distance(shared, edgePoint, { units: 'meters' })).toBeLessThan(100)
	})

	it('reports moved vertex count', () => {
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
						[31.02, 50],
						[32, 50],
						[32, 51],
						[31.02, 51],
						[31.02, 50]
					]
				]
			}
		}

		const snapped = snapFeatureToNeighbors(right, [left], 5000)
		expect(countMovedVertices(right, snapped)).toBeGreaterThan(0)
		expect(countMovedVertices(right, right)).toBe(0)
	})
})
