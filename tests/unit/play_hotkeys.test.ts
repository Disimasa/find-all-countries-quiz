import { describe, expect, it } from 'vitest'
import { isRandomCountryHotkey } from '../../src/routes/play/hotkeys'

function key(init: Partial<KeyboardEvent>): KeyboardEvent {
	return init as KeyboardEvent
}

describe('play hotkeys', () => {
	it('detects F2 as random country hotkey', () => {
		expect(isRandomCountryHotkey(key({ code: 'F2' }))).toBe(true)
		expect(isRandomCountryHotkey(key({ code: 'F2', ctrlKey: true }))).toBe(false)
		expect(isRandomCountryHotkey(key({ code: 'KeyR' }))).toBe(false)
	})
})
