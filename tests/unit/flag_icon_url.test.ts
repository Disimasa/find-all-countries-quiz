import { describe, expect, it } from 'vitest'
import { getFlagIconUrl } from '@shared/flag_icon_url'

describe('flag_icon_url', () => {
	it('resolves bundled SVG URLs for ISO codes', () => {
		expect(getFlagIconUrl('DE', 'DE')).toBeTruthy()
		expect(getFlagIconUrl('BR', 'BR')).toBeTruthy()
	})

	it('maps synthetic territories to display codes', () => {
		expect(getFlagIconUrl('SYN_NORTHERN_CYPRUS', 'SYN_NORTHERN_CYPRUS')).toBeTruthy()
		expect(getFlagIconUrl('SYN_SOMALILAND', 'SYN_SOMALILAND')).toBeTruthy()
	})

	it('returns null for unknown entities', () => {
		expect(getFlagIconUrl('UNKNOWN', 'INVALID')).toBeNull()
	})
})
