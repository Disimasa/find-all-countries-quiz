import { describe, expect, it } from 'vitest'
import { resolveFlagSource } from '@shared/flags/resolver'
import { MODERN_ERA_ID, PREWW1_ERA_ID } from '@domain/maps'

describe('flag resolver', () => {
	it('resolves modern iso flags', () => {
		expect(resolveFlagSource({ eraId: MODERN_ERA_ID, entityId: 'DE', flagCode: 'DE' })).toEqual({
			kind: 'iso',
			code: 'DE'
		})
	})

	it('resolves preww1 era assets', () => {
		expect(
			resolveFlagSource({ eraId: PREWW1_ERA_ID, entityId: 'germany-prussia' })
		).toEqual({
			kind: 'era-asset',
			path: '/flags/eras/preww1/germany-prussia.svg'
		})
	})

	it('uses explicit iso on historical era when provided', () => {
		expect(
			resolveFlagSource({ eraId: PREWW1_ERA_ID, entityId: 'sweden', flagCode: 'SE' })
		).toEqual({ kind: 'iso', code: 'SE' })
	})

	it('returns none for unknown modern entity', () => {
		expect(resolveFlagSource({ eraId: MODERN_ERA_ID, entityId: 'UNKNOWN' })).toEqual({
			kind: 'none'
		})
	})
})
