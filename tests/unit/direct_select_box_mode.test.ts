import { describe, expect, it } from 'vitest'
import type { Polygon } from 'geojson'
import { coordPathsInPixelBox, forEachVertexPath } from '$lib/dev/boundary_editor/direct_select_box_mode'

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
})
