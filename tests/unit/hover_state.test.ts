import { describe, expect, it } from 'vitest'
import {
	baseCountryVisual,
	countryVisual,
	resolveHoverableCountryId
} from '@infrastructure/map/hover_state'

describe('hover_state', () => {
	const snapshot = {
		guessedIds: new Set(['DE']),
		selectedId: 'FR'
	}

	it('ignores guessed countries for hover', () => {
		expect(resolveHoverableCountryId('DE', snapshot.guessedIds)).toBeNull()
		expect(resolveHoverableCountryId('PL', snapshot.guessedIds)).toBe('PL')
	})

	it('ignores selected country for hover', () => {
		expect(resolveHoverableCountryId('FR', snapshot.guessedIds, snapshot.selectedId)).toBeNull()
	})

	it('clears hover visual after pointer leaves country', () => {
		expect(baseCountryVisual('PL', snapshot)).toBe('default')
		expect(countryVisual('PL', snapshot, 'PL')).toBe('hover')
		expect(countryVisual('PL', snapshot, null)).toBe('default')
	})

	it('keeps selected visual when hover clears', () => {
		expect(baseCountryVisual('FR', snapshot)).toBe('selected')
		expect(countryVisual('FR', snapshot, null)).toBe('selected')
	})

	it('selected beats hover on same country', () => {
		expect(countryVisual('FR', snapshot, 'FR')).toBe('selected')
	})
})
