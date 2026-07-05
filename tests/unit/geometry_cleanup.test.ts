import { describe, expect, it } from 'vitest'
import { dropSliverParts, orderBoundaryPairsAlongRing, reconcileClippedGeometry, ringPathPosition, simplifyCoastClipRings, stripFillArtifactHoles, unionAreaFeatures } from '$lib/dev/boundary_editor/geometry_cleanup'

describe('orderBoundaryPairsAlongRing', () => {
	const ring: [number, number][] = [
		[30, 50],
		[31, 50],
		[31, 51],
		[30, 51],
		[30, 50]
	]

	it('orders scanline samples along the ring instead of by latitude', () => {
		const near: [number, number][] = [
			[31, 50.25],
			[31, 50.75],
			[31, 50.5]
		]
		const far = near.map(([_, lat]) => [33, lat] as [number, number])
		const ordered = orderBoundaryPairsAlongRing(ring, near, far)

		expect(ordered.near.map(([, lat]) => lat)).toEqual([50.25, 50.5, 50.75])
	})

	it('places boundary points on the ring perimeter', () => {
		const point: [number, number] = [31, 50.5]
		expect(ringPathPosition(ring, point)).toBeGreaterThan(0)
		expect(ringPathPosition(ring, point)).toBeLessThan(4)
	})
})

describe('stripFillArtifactHoles', () => {
	const original = {
		type: 'Feature' as const,
		properties: {},
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

	it('removes inner rings introduced by boolean fill', () => {
		const filled = {
			type: 'Feature' as const,
			properties: {},
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[30, 50],
						[32, 50],
						[32, 52],
						[30, 52],
						[30, 50]
					],
					[
						[30.2, 50.2],
						[30.3, 50.2],
						[30.3, 50.3],
						[30.2, 50.3],
						[30.2, 50.2]
					]
				]
			}
		}

		const cleaned = stripFillArtifactHoles(filled, original)
		expect(cleaned.geometry.type).toBe('Polygon')
		expect(cleaned.geometry.coordinates).toHaveLength(1)
	})

	it('keeps holes that existed before fill', () => {
		const lake = [
			[30.2, 50.2],
			[30.3, 50.2],
			[30.3, 50.3],
			[30.2, 50.3],
			[30.2, 50.2]
		]
		const withLake = {
			type: 'Feature' as const,
			properties: {},
			geometry: {
				type: 'Polygon' as const,
				coordinates: [original.geometry.coordinates[0], lake]
			}
		}
		const filled = {
			type: 'Feature' as const,
			properties: {},
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[30, 50],
						[32, 50],
						[32, 52],
						[30, 52],
						[30, 50]
					],
					lake,
					[
						[31.2, 50.2],
						[31.3, 50.2],
						[31.3, 50.3],
						[31.2, 50.3],
						[31.2, 50.2]
					]
				]
			}
		}

		const cleaned = stripFillArtifactHoles(filled, withLake)
		expect(cleaned.geometry.coordinates).toHaveLength(2)
	})
})

describe('unionAreaFeatures', () => {
	it('merges parts without throwing on moderately complex polygons', () => {
		const left = {
			type: 'Feature' as const,
			properties: {},
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
			properties: {},
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[31, 50],
						[32, 50],
						[32, 51],
						[31, 51],
						[31, 50]
					]
				]
			}
		}

		const merged = unionAreaFeatures([left, right])
		expect(merged?.geometry.type).toBe('Polygon')
	})
})

describe('simplifyCoastClipRings', () => {
	it('reduces dense coastline rings after water clip', () => {
		const open: [number, number][] = []
		for (let i = 0; i <= 40; i++) {
			open.push([30 + i * 0.02, 50 + Math.sin(i * 0.7) * 0.02])
		}
		open.push([30, 50])

		const dense = {
			type: 'Feature' as const,
			properties: { entity_id: 'coast' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [open]
			}
		}

		const before = open.length - 1
		const simplified = simplifyCoastClipRings(dense)
		const after =
			simplified.geometry.type === 'Polygon'
				? simplified.geometry.coordinates[0].length - 1
				: 0

		expect(after).toBeLessThan(before)
		expect(after).toBeGreaterThanOrEqual(4)
	})
})

describe('reconcileClippedGeometry', () => {
	it('keeps every original island when only one part was clipped', () => {
		const northIsland = {
			type: 'Feature' as const,
			properties: { entity_id: 'two-islands' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[8.5, 42.2],
						[9.4, 42.2],
						[9.4, 43.0],
						[8.5, 43.0],
						[8.5, 42.2]
					]
				]
			}
		}

		const southIsland = {
			type: 'Feature' as const,
			properties: { entity_id: 'two-islands' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[8.2, 38.8],
						[9.6, 38.8],
						[9.6, 40.2],
						[8.2, 40.2],
						[8.2, 38.8]
					]
				]
			}
		}

		const original = {
			type: 'Feature' as const,
			properties: { entity_id: 'two-islands' },
			geometry: {
				type: 'MultiPolygon' as const,
				coordinates: [
					northIsland.geometry.coordinates,
					southIsland.geometry.coordinates
				]
			}
		}

		const clippedSouth = {
			...southIsland,
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[8.2, 39.2],
						[9.6, 39.2],
						[9.6, 40.2],
						[8.2, 40.2],
						[8.2, 39.2]
					]
				]
			}
		}

		const clipped = {
			type: 'Feature' as const,
			properties: { entity_id: 'two-islands' },
			geometry: {
				type: 'MultiPolygon' as const,
				coordinates: [
					northIsland.geometry.coordinates,
					clippedSouth.geometry.coordinates
				]
			}
		}

		const result = reconcileClippedGeometry(clipped, original)
		expect(result.geometry.type).toBe('MultiPolygon')
		if (result.geometry.type === 'MultiPolygon') {
			expect(result.geometry.coordinates).toHaveLength(2)
		}
	})
})
