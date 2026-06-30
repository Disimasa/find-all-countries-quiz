import { describe, expect, it, vi } from 'vitest'
import { LOBBY_PIN_MODES } from '@lobby-teaser'
import {
	pickNextTeaserCountryId,
	pickNextTeaserMode,
	pickRandomExcludingRecent
} from '@lobby-teaser'

describe('lobby_teaser_picker', () => {
	it('pickNextTeaserCountryId returns null for empty pool', () => {
		expect(pickNextTeaserCountryId([], [])).toBeNull()
	})

	it('pickNextTeaserCountryId returns the only id', () => {
		expect(pickNextTeaserCountryId(['BR'], [])).toEqual({
			pick: 'BR',
			nextRecent: ['BR']
		})
	})

	it('pickNextTeaserCountryId avoids ids in recent window', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)

		const first = pickNextTeaserCountryId(['BR', 'AR', 'CL'], [])
		expect(first?.pick).toBe('BR')
		expect(first?.nextRecent).toEqual(['BR'])

		const second = pickNextTeaserCountryId(['BR', 'AR', 'CL'], first!.nextRecent)
		expect(second?.pick).not.toBe('BR')
		expect(second?.nextRecent[0]).toBe(second?.pick)
		expect(second?.nextRecent).toHaveLength(2)

		vi.restoreAllMocks()
	})

	it('pickNextTeaserCountryId falls back when recent covers all ids', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.99)

		const result = pickNextTeaserCountryId(['BR', 'AR'], ['BR', 'AR'])
		expect(result?.pick).toBe('AR')
		expect(result?.nextRecent).toEqual(['AR', 'BR'])

		vi.restoreAllMocks()
	})

	it('pickNextTeaserMode cycles without repeating until all modes shown', () => {
		let recent: (typeof LOBBY_PIN_MODES)[number][] = []
		const seen: (typeof LOBBY_PIN_MODES)[number][] = []

		for (let step = 0; step < LOBBY_PIN_MODES.length; step++) {
			vi.spyOn(Math, 'random').mockReturnValue(0)
			const pool = LOBBY_PIN_MODES.filter((mode) => !recent.includes(mode))
			const result = pickNextTeaserMode(recent)
			expect(result?.pick).toBe(pool[0])
			expect(recent).not.toContain(result?.pick)
			seen.push(result!.pick)
			recent = result!.nextRecent
			vi.restoreAllMocks()
		}

		expect(new Set(seen).size).toBe(LOBBY_PIN_MODES.length)
	})

	it('pickRandomExcludingRecent keeps recent window size', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)

		const ids = ['A', 'B', 'C', 'D']
		let recent: string[] = []
		for (let i = 0; i < 5; i++) {
			const result = pickRandomExcludingRecent(ids, recent, 2)!
			recent = result.nextRecent
			expect(recent.length).toBeLessThanOrEqual(2)
		}

		vi.restoreAllMocks()
	})
})
