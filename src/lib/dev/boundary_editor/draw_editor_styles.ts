import MapboxDraw from 'maplibre-gl-draw'

const UNSELECTED_VERTEX_COLOR = '#f59e0b'
const SELECTED_VERTEX_COLOR = '#dc2626'

type DrawStyle = {
	id: string
	type: string
	filter?: unknown[]
	paint?: Record<string, unknown>
	layout?: Record<string, unknown>
}

function cloneDefaultDrawStyles(): DrawStyle[] {
	return JSON.parse(JSON.stringify(new MapboxDraw().options.styles)) as DrawStyle[]
}

/** Highlight multi-selected vertices in direct_select (default theme uses same color). */
export function buildBoundaryEditorDrawStyles(): DrawStyle[] {
	const styles = cloneDefaultDrawStyles()

	for (const style of styles) {
		const isInactiveVertexLayer =
			style.id.startsWith('gl-draw-polygon-and-line-vertex-stroke-inactive') ||
			style.id.startsWith('gl-draw-polygon-and-line-vertex-inactive')

		if (isInactiveVertexLayer) {
			style.filter = [
				'all',
				['==', 'meta', 'vertex'],
				['==', '$type', 'Point'],
				['!=', 'mode', 'static'],
				['==', 'active', 'false']
			]
		}

		if (style.id.startsWith('gl-draw-polygon-and-line-vertex-inactive')) {
			style.paint = {
				...style.paint,
				'circle-radius': 3,
				'circle-color': UNSELECTED_VERTEX_COLOR
			}
		}

		if (style.id === 'gl-draw-point-stroke-active' || style.id === 'gl-draw-point-active') {
			style.filter = [
				'all',
				['==', '$type', 'Point'],
				['==', 'active', 'true'],
				['==', 'meta', 'feature']
			]
		}
	}

	const insertAfter = styles.findIndex((style) =>
		style.id.startsWith('gl-draw-polygon-and-line-vertex-inactive')
	)
	const selectedLayers: DrawStyle[] = [
		{
			id: 'gl-draw-vertex-stroke-selected',
			type: 'circle',
			filter: [
				'all',
				['==', 'meta', 'vertex'],
				['==', 'active', 'true'],
				['==', '$type', 'Point']
			],
			paint: {
				'circle-radius': 8,
				'circle-color': '#ffffff'
			}
		},
		{
			id: 'gl-draw-vertex-selected',
			type: 'circle',
			filter: [
				'all',
				['==', 'meta', 'vertex'],
				['==', 'active', 'true'],
				['==', '$type', 'Point']
			],
			paint: {
				'circle-radius': 5,
				'circle-color': SELECTED_VERTEX_COLOR
			}
		}
	]

	if (insertAfter >= 0) {
		styles.splice(insertAfter + 1, 0, ...selectedLayers)
	} else {
		styles.push(...selectedLayers)
	}

	return styles
}
