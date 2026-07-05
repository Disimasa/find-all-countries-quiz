import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_ERA_ID, MODERN_ERA_ID, PREWW1_ERA_ID } from '@domain/maps'
import { buildPlayHref, eraId } from '../../src/routes/controller.ts'

describe('era settings', () => {
	beforeEach(() => {
		eraId.set(DEFAULT_ERA_ID)
	})

	it('adds era query param only for non-modern play href', () => {
		eraId.set(PREWW1_ERA_ID)
		expect(buildPlayHref()).toBe('/play?era=preww1&timer=30&lives=3')
		eraId.set(MODERN_ERA_ID)
		expect(buildPlayHref()).toBe('/play?timer=30&lives=3')
	})
})
