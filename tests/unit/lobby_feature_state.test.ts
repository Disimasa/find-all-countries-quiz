import { describe, expect, it } from 'vitest'
import { lobbyCountryVisual, lobbyHoverableCountryId } from '@infrastructure/map/lobby_feature_state'

describe('lobby_feature_state', () => {
	it('highlights picked and hint countries independently', () => {
		expect(lobbyCountryVisual('BR', 'BR', 'AR')).toBe('selected')
		expect(lobbyCountryVisual('AR', 'BR', 'AR')).toBe('selected')
		expect(lobbyCountryVisual('CL', 'BR', 'AR')).toBe('default')
	})

	it('highlights a single country when pick and hint match', () => {
		expect(lobbyCountryVisual('BR', 'BR', 'BR')).toBe('selected')
	})

	it('returns default when nothing is selected', () => {
		expect(lobbyCountryVisual('BR', null, null)).toBe('default')
	})
})

describe('lobby_hoverable_country_id', () => {
	it('blocks hover for picked and hint countries', () => {
		expect(lobbyHoverableCountryId('BR', 'BR', 'AR')).toBeNull()
		expect(lobbyHoverableCountryId('AR', 'BR', 'AR')).toBeNull()
		expect(lobbyHoverableCountryId('CL', 'BR', 'AR')).toBe('CL')
	})
})
