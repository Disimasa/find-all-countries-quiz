import { describe, expect, it } from 'vitest'
import { parseEraId } from '../../src/routes/play/parse_config.ts'
import { PREWW1_ERA_ID, CE100_ERA_ID, MODERN_ERA_ID } from '@domain/maps'
import { installLocalStorageMock } from './helpers/local_storage_mock.ts'

describe('parseEraId', () => {
	it('parses era from query string', () => {
		installLocalStorageMock()
		expect(parseEraId('?era=preww1')).toBe(PREWW1_ERA_ID)
		expect(parseEraId('?era=ce100')).toBe(CE100_ERA_ID)
	})

	it('ignores invalid era', () => {
		installLocalStorageMock()
		expect(parseEraId('?era=invalid')).toBe(MODERN_ERA_ID)
	})
})
