import { describe, expect, it } from 'vitest'
import {
	isActiveOnDate,
	parseCShapesDate
} from '../../scripts/cshapes_date.mjs'

describe('CShapes date filtering', () => {
	const snapshot = new Date('1914-07-28')

	it('parses CShapes gwsdate format', () => {
		expect(parseCShapesDate('25.12.1991 23:00:00')?.getFullYear()).toBe(1991)
		expect(parseCShapesDate('16.04.1914 23:00:00')?.getMonth()).toBe(3)
	})

	it('treats Ukraine as inactive in 1914', () => {
		const ukraine = {
			type: 'Feature',
			properties: {
				cntry_name: 'Ukraine',
				gwcode: 369,
				gwsdate: '25.12.1991 23:00:00',
				gwedate: '16.03.2014 23:00:00'
			},
			geometry: null
		}
		expect(isActiveOnDate(ukraine, snapshot)).toBe(false)
	})

	it('treats Russian Empire period as active in 1914', () => {
		const russia = {
			type: 'Feature',
			properties: {
				cntry_name: 'Russia (Soviet Union)',
				gwcode: 365,
				gwsdate: '16.04.1914 23:00:00',
				gwedate: '04.12.1917 23:00:00'
			},
			geometry: null
		}
		expect(isActiveOnDate(russia, snapshot)).toBe(true)
	})
})
