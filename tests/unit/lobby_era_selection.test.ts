import { describe, expect, it } from 'vitest'
import { isLobbyEraSelectionRedundant } from '../../src/routes/lobby_era_selection.ts'

describe('isLobbyEraSelectionRedundant', () => {
	it('returns true only when store and map already match the selection', () => {
		expect(isLobbyEraSelectionRedundant('preww1', 'preww1', 'preww1')).toBe(true)
	})

	it('returns false when the map era is out of sync with the store', () => {
		expect(isLobbyEraSelectionRedundant('preww1', 'preww1', 'modern')).toBe(false)
	})

	it('returns false when the store differs from the selection', () => {
		expect(isLobbyEraSelectionRedundant('preww1', 'modern', 'modern')).toBe(false)
	})
})
