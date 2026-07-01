import { describe, expect, it } from 'vitest'
import type { Feature } from 'geojson'
import {
	expandFeatureBounds,
	featureBBoxSpan,
	featureBounds,
	featureCentroid,
	filterTeaserCountryIds
} from '@infrastructure/map/country_centroid'

describe('country_centroid', () => {
	const square: Feature = {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[0, 0],
					[10, 0],
					[10, 10],
					[0, 10],
					[0, 0]
				]
			]
		}
	}

	const tiny: Feature = {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[0, 0],
					[0.2, 0],
					[0.2, 0.2],
					[0, 0.2],
					[0, 0]
				]
			]
		}
	}

	it('returns centroid of polygon ring', () => {
		expect(featureCentroid(square)).toEqual([5, 5])
	})

	it('measures bbox span for teaser filtering', () => {
		expect(featureBBoxSpan(square)).toBe(10)
		expect(featureBBoxSpan(tiny)).toBeCloseTo(0.2)
	})

	it('builds bounds and expands them with surrounding margin', () => {
		expect(featureBounds(square)).toEqual([0, 0, 10, 10])
		expect(expandFeatureBounds([0, 0, 10, 10])).toEqual([-4.2, -4.2, 14.2, 14.2])
	})

	it('filters out countries below minimum bbox span', () => {
		const collection = {
			type: 'FeatureCollection' as const,
			features: [square, tiny]
		}

		const ids = filterTeaserCountryIds(collection, () => 'X', 1)
		expect(ids).toEqual(['X'])
	})

	it('filters out excluded ids and northern centroids', () => {
		const north: Feature = {
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[0, 70],
						[10, 70],
						[10, 80],
						[0, 80],
						[0, 70]
					]
				]
			}
		}

		const collection = {
			type: 'FeatureCollection' as const,
			features: [square, north]
		}

		expect(
			filterTeaserCountryIds(collection, (f) => (f === north ? 'GL' : 'BR'), 1, {
				excludedIds: ['GL', 'JP']
			})
		).toEqual(['BR'])

		expect(
			filterTeaserCountryIds(collection, (f) => (f === north ? 'NO' : 'BR'), 1, {
				maxCentroidLat: 62
			})
		).toEqual(['BR'])
	})
})
