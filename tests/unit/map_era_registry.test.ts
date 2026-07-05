import { describe, expect, it } from 'vitest'

import { MapEraRegistry, MODERN_ERA_ID, PREWW1_ERA_ID, CE100_ERA_ID, CE1300_ERA_ID, DEFAULT_ERA_ID } from '@domain/maps'

import { ModernWorldMap } from '@domain/maps'

import { PreWW1WorldMap } from '@domain/maps'

import { Ce100WorldMap } from '@domain/maps'

import { Ce1300WorldMap } from '@domain/maps'



describe('MapEraRegistry', () => {

	it('lists registered eras in descending year order', () => {

		expect(MapEraRegistry.listIds()).toEqual([

			MODERN_ERA_ID,

			PREWW1_ERA_ID,

			CE1300_ERA_ID,

			CE100_ERA_ID

		])

	})



	it('creates modern, preww1, ce100, and ce1300 maps', () => {

		expect(MapEraRegistry.create(MODERN_ERA_ID)).toBeInstanceOf(ModernWorldMap)

		expect(MapEraRegistry.create(PREWW1_ERA_ID)).toBeInstanceOf(PreWW1WorldMap)

		expect(MapEraRegistry.create(CE100_ERA_ID)).toBeInstanceOf(Ce100WorldMap)

		expect(MapEraRegistry.create(CE1300_ERA_ID)).toBeInstanceOf(Ce1300WorldMap)

	})



	it('throws for unknown era', () => {

		expect(() => MapEraRegistry.create('unknown')).toThrow(/Unknown map era/)

	})



	it('resolves theme profiles', () => {

		expect(MapEraRegistry.resolveThemeProfileId(MODERN_ERA_ID)).toBe('modern')

		expect(MapEraRegistry.resolveThemeProfileId(PREWW1_ERA_ID)).toBe('parchment')

		expect(MapEraRegistry.resolveThemeProfileId(CE100_ERA_ID)).toBe('parchment')

		expect(MapEraRegistry.resolveThemeProfileId(CE1300_ERA_ID)).toBe('parchment')

	})



	it('defaults to modern era id', () => {

		expect(DEFAULT_ERA_ID).toBe(MODERN_ERA_ID)

	})

})

