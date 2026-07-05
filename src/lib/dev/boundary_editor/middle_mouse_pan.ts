import type { Map as MaplibreglMap } from 'maplibre-gl'

export type MiddleMousePanControl = {
	destroy: () => void
}

export function isMiddleMouseButton(button: number): boolean {
	return button === 1
}

export function isMiddleMouseHeld(buttons: number): boolean {
	return (buttons & 4) === 4
}

/** Pan the map while the middle mouse button is held (works even when dragPan is disabled). */
export function attachMiddleMousePan(map: MaplibreglMap): MiddleMousePanControl {
	const canvas = map.getCanvas()
	let active = false
	let lastX = 0
	let lastY = 0
	let previousCursor = ''

	function stop(): void {
		if (!active) return
		active = false
		canvas.style.cursor = previousCursor
	}

	function onMouseDown(event: MouseEvent): void {
		if (!isMiddleMouseButton(event.button)) return
		event.preventDefault()
		event.stopPropagation()
		active = true
		lastX = event.clientX
		lastY = event.clientY
		previousCursor = canvas.style.cursor
		canvas.style.cursor = 'grabbing'
	}

	function onMouseMove(event: MouseEvent): void {
		if (!active) return
		if (!isMiddleMouseHeld(event.buttons)) {
			stop()
			return
		}

		event.preventDefault()
		const dx = event.clientX - lastX
		const dy = event.clientY - lastY
		lastX = event.clientX
		lastY = event.clientY
		if (dx !== 0 || dy !== 0) {
			map.panBy([-dx, -dy], { animate: false })
		}
	}

	function onMouseUp(event: MouseEvent): void {
		if (!isMiddleMouseButton(event.button)) return
		stop()
	}

	function onAuxClick(event: MouseEvent): void {
		if (isMiddleMouseButton(event.button)) event.preventDefault()
	}

	canvas.addEventListener('mousedown', onMouseDown, { capture: true })
	window.addEventListener('mousemove', onMouseMove)
	window.addEventListener('mouseup', onMouseUp)
	canvas.addEventListener('auxclick', onAuxClick)

	return {
		destroy(): void {
			stop()
			canvas.removeEventListener('mousedown', onMouseDown, { capture: true })
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mouseup', onMouseUp)
			canvas.removeEventListener('auxclick', onAuxClick)
		}
	}
}
