import { describe, expect, it, vi } from 'vitest'
import type { Polygon } from 'geojson'
import {
	coordPathsInPixelBox,
	forEachVertexPath,
	restoreMapPan,
	suspendMapPanForShiftSelect
} from '$lib/dev/boundary_editor/direct_select_box_mode'

const square: Polygon = {
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

describe('direct_select_box_mode', () => {
	it('lists polygon vertex paths without the closing duplicate', () => {
		const paths: string[] = []
		forEachVertexPath(square, (path) => paths.push(path))
		expect(paths).toEqual(['0.0', '0.1', '0.2', '0.3'])
	})

	it('selects vertices inside a pixel box', () => {
		const project = ([lng, lat]: [number, number]) => ({ x: lng, y: lat })
		const selected = coordPathsInPixelBox(square, project, 9, -1, 11, 11)
		expect(selected).toEqual(['0.1', '0.2'])
	})

	it('suspends and restores map pan only when it was enabled', () => {
		const snapshot: { dragPanWasEnabled?: boolean; boxZoomWasEnabled?: boolean } = {}
		const dragPan = { isEnabled: vi.fn(() => true), enable: vi.fn(), disable: vi.fn() }
		const boxZoom = { isEnabled: vi.fn(() => false), enable: vi.fn(), disable: vi.fn() }
		const map = { dragPan, boxZoom } as unknown as import('maplibre-gl').Map

		suspendMapPanForShiftSelect(map, snapshot)
		expect(dragPan.disable).toHaveBeenCalledTimes(1)

		dragPan.disable.mockClear()
		suspendMapPanForShiftSelect(map, snapshot)
		expect(dragPan.disable).toHaveBeenCalledTimes(1)

		restoreMapPan(map, snapshot)
		expect(dragPan.enable).toHaveBeenCalledTimes(1)
		expect(boxZoom.enable).not.toHaveBeenCalled()
		expect(snapshot.dragPanWasEnabled).toBeUndefined()
	})
})
