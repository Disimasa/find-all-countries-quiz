import { describe, expect, it } from 'vitest'
import { isClickOnMapMarker } from '@infrastructure/map/marker_click_guard'

function fakeTarget(markerAncestor: boolean) {
	return {
		closest(selector: string) {
			if (selector === '.maplibregl-marker' && markerAncestor) return {}
			return null
		}
	}
}

describe('marker_click_guard', () => {
	it('detects clicks inside a map marker', () => {
		expect(isClickOnMapMarker(fakeTarget(true))).toBe(true)
	})

	it('ignores clicks outside map markers', () => {
		expect(isClickOnMapMarker(fakeTarget(false))).toBe(false)
		expect(isClickOnMapMarker(null)).toBe(false)
	})
})
