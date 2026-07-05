import { describe, expect, it } from 'vitest'
import { isMiddleMouseButton, isMiddleMouseHeld } from '$lib/dev/boundary_editor/middle_mouse_pan'

describe('middle_mouse_pan', () => {
	it('detects middle mouse button', () => {
		expect(isMiddleMouseButton(0)).toBe(false)
		expect(isMiddleMouseButton(1)).toBe(true)
		expect(isMiddleMouseButton(2)).toBe(false)
	})

	it('detects held middle button via buttons bitmask', () => {
		expect(isMiddleMouseHeld(1)).toBe(false)
		expect(isMiddleMouseHeld(4)).toBe(true)
		expect(isMiddleMouseHeld(5)).toBe(true)
	})
})
