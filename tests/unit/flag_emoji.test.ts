import { describe, expect, it } from 'vitest'
import { getFlagEmoji, resolveFlagCode } from '@shared/flag_emoji'

describe('flag_emoji', () => {
	it('builds emoji from ISO flag code', () => {
		expect(getFlagEmoji('DE', 'DE')).toBe('🇩🇪')
	})

	it('falls back to entity id when flag code is invalid', () => {
		expect(getFlagEmoji('BR', 'BR')).toBe('🇧🇷')
	})

	it('maps synthetic territories to display codes', () => {
		expect(resolveFlagCode('SYN_NORTHERN_CYPRUS', 'SYN_NORTHERN_CYPRUS')).toBe('CY')
		expect(getFlagEmoji('SYN_SOMALILAND', 'SYN_SOMALILAND')).toBe('🇸🇴')
	})

	it('returns white flag for unknown entities', () => {
		expect(getFlagEmoji('UNKNOWN', 'INVALID')).toBe('🏳️')
	})
})
