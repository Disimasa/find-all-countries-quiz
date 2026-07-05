import { describe, expect, it } from 'vitest'
import { buildBoundaryEditorDrawStyles } from '$lib/dev/boundary_editor/draw_editor_styles'

describe('draw_editor_styles', () => {
	it('styles inactive and selected vertices differently', () => {
		const styles = buildBoundaryEditorDrawStyles()

		const inactive = styles.find((style) =>
			style.id.startsWith('gl-draw-polygon-and-line-vertex-inactive')
		)
		const selected = styles.find((style) => style.id === 'gl-draw-vertex-selected')

		expect(inactive?.filter).toContainEqual(['==', 'active', 'false'])
		expect(selected?.paint?.['circle-color']).toBe('#dc2626')
	})
})
