import { describe, expect, it } from 'vitest'
import {
	isoDateToDecimalDate,
	padDate,
	toDecimalEarliest,
	toDecimalExclusiveEnd,
	yearToDecimal
} from '../../scripts/lib/ohm/date.mjs'

describe('ohm date helpers', () => {
	it('parses full ISO dates', () => {
		expect(toDecimalEarliest('1279-07-01')).toBeCloseTo(1279.497, 2)
	})

	it('pads year-only start/end dates', () => {
		expect(padDate('1279', 'start')).toBe('1279-01-01')
		expect(padDate('1279', 'end')).toBe('1279-12-31')
	})

	it('computes exclusive end after year boundary', () => {
		const end = toDecimalExclusiveEnd('1279')
		expect(end).not.toBeNull()
		expect(end!).toBeGreaterThan(yearToDecimal(1279))
		expect(end!).toBeLessThan(yearToDecimal(1280))
	})

	it('handles BCE years in isoDateToDecimalDate', () => {
		const dec = isoDateToDecimalDate('-0100-01-01', false)
		expect(dec).not.toBeNull()
		expect(dec!).toBeLessThan(0)
	})
})
