import { describe, expect, it } from 'vitest'
import {
	baseCountryVisual,
	countryVisual,
	resolveGuessedTooltipId,
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

	it('keeps guessed visual when hovered', () => {
		expect(countryVisual('DE', snapshot, 'DE')).toBe('guessed')
		expect(countryVisual('DE', snapshot, null)).toBe('guessed')
	})

	it('keeps selected visual when hover clears', () => {
		expect(baseCountryVisual('FR', snapshot)).toBe('selected')
		expect(countryVisual('FR', snapshot, null)).toBe('selected')
	})

	it('selected beats hover on same country', () => {
		expect(countryVisual('FR', snapshot, 'FR')).toBe('selected')
	})

	it('resolves tooltip id only for guessed countries', () => {
		expect(resolveGuessedTooltipId('DE', snapshot.guessedIds)).toBe('DE')
		expect(resolveGuessedTooltipId('PL', snapshot.guessedIds)).toBeNull()
		expect(resolveGuessedTooltipId(null, snapshot.guessedIds)).toBeNull()
	})
})
