import { readFileSync } from 'node:fs'
import { area, bbox, intersect } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import {
	buildSilhouetteWedge,
	fillEntityInDirection,
	type FillDirection
} from '$lib/dev/boundary_editor/directional_fill'
import { dropSliverParts } from '$lib/dev/boundary_editor/geometry_cleanup'

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
				[34, 50],
				[34, 51],
				[33, 51],
				[33, 50]
			]
		]
	}
}

const lShape = {
	type: 'Feature' as const,
	properties: { entity_id: 'l-shape' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[30, 50],
				[31, 50],
				[31, 50.4],
				[30.4, 50.4],
				[30.4, 51],
				[30, 51],
				[30, 50]
			]
		]
	}
}

const collection = {
	type: 'FeatureCollection' as const,
	features: [left, right]
}

describe('buildSilhouetteWedge', () => {
	it('caps east expansion at the nearest neighbor', () => {
		const wedge = buildSilhouetteWedge(left, 'east', [right])
		expect(wedge).not.toBeNull()
		const [, , east] = bbox(wedge!) as [number, number, number, number]
		expect(east).toBeCloseTo(33, 5)
	})

	it('starts the wedge at the polygon edge, not the bbox edge', () => {
		const wedge = buildSilhouetteWedge(lShape, 'east', [])
		expect(wedge).not.toBeNull()
		const ring = wedge!.geometry.type === 'Polygon' ? wedge!.geometry.coordinates[0] : wedge!.geometry.coordinates[0][0]
		const nearBoundary = ring.filter(([lng, lat]) => lat > 50.55 && lat < 50.85).map(([lng]) => lng)

		expect(nearBoundary.length).toBeGreaterThan(0)
		expect(Math.min(...nearBoundary)).toBeGreaterThan(30.35)
		expect(Math.min(...nearBoundary)).toBeLessThan(30.45)
	})
})

describe('fillEntityInDirection', () => {
	it('expands east until the next country', () => {
		const result = fillEntityInDirection(left, collection, 'left', 'east')

		expect(result.expanded).toBe(true)
		expect(area(result.feature)).toBeGreaterThan(area(left))
		expect(result.feature.geometry.type).toBe('Polygon')
	})

	it('stops at the neighbor border instead of covering it', () => {
		const result = fillEntityInDirection(left, collection, 'left', 'east')
		const ring =
			result.feature.geometry.type === 'Polygon'
				? result.feature.geometry.coordinates[0]
				: result.feature.geometry.coordinates[0][0]
		const maxLng = Math.max(...ring.map(([lng]) => lng))

		expect(maxLng).toBeLessThan(33.01)
		expect(maxLng).toBeGreaterThan(31)
	})

	it('can still expand west when only eastern neighbors exist', () => {
		const result = fillEntityInDirection(left, collection, 'left', 'west')

		expect(result.expanded).toBe(true)
		expect(area(result.feature)).toBeGreaterThan(area(left))
	})

	it('does not add a rectangular annex outside the polygon silhouette', () => {
		const solo = { type: 'FeatureCollection' as const, features: [lShape] }
		const result = fillEntityInDirection(lShape, solo, 'l-shape', 'east')
		const ring = result.feature.geometry.coordinates[0]

		const gapFill = ring.filter(
			([lng, lat]) => lat > 50.55 && lat < 50.85 && lng > 30.45 && lng < 30.99
		)

		expect(gapFill.length).toBe(0)
	})

	it.each<FillDirection>(['north', 'south', 'east', 'west'])(
		'returns a valid polygon for %s',
		(direction) => {
			const result = fillEntityInDirection(left, collection, 'left', direction)
			expect(['Polygon', 'MultiPolygon']).toContain(result.feature.geometry.type)
		}
	)

	it('does not leave inner rings when the source polygon had none', () => {
		const result = fillEntityInDirection(left, collection, 'left', 'north')
		if (result.feature.geometry.type === 'Polygon') {
			expect(result.feature.geometry.coordinates.length).toBe(1)
		} else {
			for (const part of result.feature.geometry.coordinates) {
				expect(part.length).toBe(1)
			}
		}
	})

	it('does not expand through a lateral neighbor between scanlines', () => {
		const tallEast = {
			type: 'Feature' as const,
			properties: { entity_id: 'tall-east' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[33, 50],
						[34, 50],
						[34, 52],
						[33, 52],
						[33, 50]
					]
				]
			}
		}
		const partialWest = {
			type: 'Feature' as const,
			properties: { entity_id: 'partial-west' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[31, 50.5],
						[32, 50.5],
						[32, 51.5],
						[31, 51.5],
						[31, 50.5]
					]
				]
			}
		}
		const era = { type: 'FeatureCollection' as const, features: [tallEast, partialWest] }
		const result = fillEntityInDirection(tallEast, era, 'tall-east', 'west')
		const ring =
			result.feature.geometry.type === 'Polygon'
				? result.feature.geometry.coordinates[0]
				: result.feature.geometry.coordinates[0][0]

		const midLat = ring.filter(([, lat]) => lat > 50.55 && lat < 51.45).map(([lng]) => lng)
		const lowLat = ring.filter(([, lat]) => lat > 49.95 && lat < 50.15).map(([lng]) => lng)

		expect(Math.min(...midLat)).toBeGreaterThan(31.9)
		expect(Math.min(...lowLat)).toBeLessThan(31.5)
	})

	it('does not cover neighboring principalities on ce1300 Ryazan fills', () => {
		const collection = JSON.parse(
			readFileSync('static/data/eras/ce1300/revisions/2026-07-04T21-30-37Z.geojson', 'utf8')
		)
		const ryazan = collection.features.find(
			(feature: { properties?: { entity_id?: string } }) =>
				feature.properties?.entity_id === 'ryazan'
		)
		const moscow = collection.features.find(
			(feature: { properties?: { entity_id?: string } }) =>
				feature.properties?.entity_id === 'moscow'
		)
		const tver = collection.features.find(
			(feature: { properties?: { entity_id?: string } }) =>
				feature.properties?.entity_id === 'tver'
		)
		expect(ryazan).toBeTruthy()

		for (const direction of ['north', 'south', 'east', 'west'] as FillDirection[]) {
			const result = fillEntityInDirection(ryazan, collection, 'ryazan', direction)
			for (const neighbor of [moscow, tver]) {
				if (!neighbor) continue
				let overlap = 0
				try {
					const hit = intersect(result.feature, neighbor)
					if (hit) overlap = area(hit)
				} catch {
					overlap = 0
				}
				expect(overlap).toBeLessThan(1)
			}
		}
	})

	it('can expand east after a north fill on real-era geometry', () => {
		const collection = JSON.parse(
			readFileSync('static/data/eras/ce1300/boundaries.geojson', 'utf8')
		)
		const target = collection.features.find(
			(feature: { properties?: { entity_id?: string } }) =>
				feature.properties?.entity_id === 'vladimir-suzdal'
		)
		expect(target).toBeTruthy()

		const north = fillEntityInDirection(target, collection, 'vladimir-suzdal', 'north')
		const mergedCollection = {
			...collection,
			features: collection.features.map(
				(feature: { properties?: { entity_id?: string } }) =>
					feature.properties?.entity_id === 'vladimir-suzdal' ? north.feature : feature
			)
		}
		const east = fillEntityInDirection(north.feature, mergedCollection, 'vladimir-suzdal', 'east')

		expect(east.expanded).toBe(true)
		expect(east.areaAfterSqM).toBeGreaterThan(east.areaBeforeSqM)
	})

	it('drops micro polygon slivers after multi-direction fill', () => {
		const messy = {
			type: 'Feature' as const,
			properties: {},
			geometry: {
				type: 'MultiPolygon' as const,
				coordinates: [
					left.geometry.coordinates,
					[
						[
							[31.01, 50.01],
							[31.011, 50.011],
							[31.0105, 50.012],
							[31.01, 50.01]
						]
					]
				]
			}
		}

		const cleaned = dropSliverParts(messy)
		expect(cleaned.geometry.type).toBe('Polygon')
		expect(area(cleaned)).toBeCloseTo(area(left), 0)
	})
})
