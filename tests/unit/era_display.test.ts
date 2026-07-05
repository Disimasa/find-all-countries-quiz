import { describe, expect, it } from 'vitest'

import { messages } from '@i18n'
import { MapEraRegistry } from '@domain/maps'

import { formatPlayEraLabel } from '../../src/routes/play/era_display.ts'

describe('formatPlayEraLabel', () => {
	it('formats historical eras with AD / CE wording', () => {
		const ru = (key: keyof (typeof messages)['ru']) => messages.ru[key]
		const en = (key: keyof (typeof messages)['en']) => messages.en[key]

		expect(
			formatPlayEraLabel('ce1300', MapEraRegistry.getRegistration('ce1300'), ru)
		).toBe('1300 год нашей эры')
		expect(
			formatPlayEraLabel('ce1300', MapEraRegistry.getRegistration('ce1300'), en)
		).toBe('1300 AD')
	})

	it('keeps the modern era label without a year', () => {
		const ru = (key: keyof (typeof messages)['ru']) => messages.ru[key]

		expect(
			formatPlayEraLabel('modern', MapEraRegistry.getRegistration('modern'), ru)
		).toBe('Современная')
	})
})
