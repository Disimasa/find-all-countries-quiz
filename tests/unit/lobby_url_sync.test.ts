import { describe, expect, it } from 'vitest'

import { CE1300_ERA_ID, DEFAULT_ERA_ID, PREWW1_ERA_ID } from '@domain/maps'
import { DEFAULT_GAME_SETTINGS } from '@persist'

import {
	initialLobbySyncedSearch,
	parseLobbySearchSync,
	resolveLobbyUrlPush,
	shouldApplyLobbySearchFromUrl,
	shouldSwitchMapEraFromUrl
} from '../../src/routes/lobby_url_sync.ts'

describe('lobby_url_sync', () => {
	describe('shouldApplyLobbySearchFromUrl', () => {
		it('returns false when search is already synced', () => {
			expect(shouldApplyLobbySearchFromUrl('', '')).toBe(false)
			expect(shouldApplyLobbySearchFromUrl('?timer=30&lives=3', '?timer=30&lives=3')).toBe(false)
		})

		it('returns true when search differs from synced state', () => {
			expect(shouldApplyLobbySearchFromUrl('', null)).toBe(true)
			expect(shouldApplyLobbySearchFromUrl('?era=ce1300', '?timer=30&lives=3')).toBe(true)
		})
	})

	describe('parseLobbySearchSync', () => {
		it('marks bare / as synced without settings (no reactive loop)', () => {
			expect(parseLobbySearchSync('')).toEqual({
				settings: null,
				syncedSearch: ''
			})
		})

		it('parses shared lobby settings and records synced search', () => {
			expect(parseLobbySearchSync('?era=ce1300&timer=60&lives=5')).toEqual({
				settings: {
					eraId: CE1300_ERA_ID,
					timerEnabled: true,
					timerMinutes: 60,
					livesEnabled: true,
					maxLives: 5
				},
				syncedSearch: '?era=ce1300&timer=60&lives=5'
			})
		})

		it('parses timer-only search without era', () => {
			expect(parseLobbySearchSync('?timer=0&lives=3').settings).toEqual({
				timerEnabled: false,
				livesEnabled: true,
				maxLives: 3
			})
		})

		it('does not re-trigger after syncing empty search', () => {
			const first = parseLobbySearchSync('')
			expect(shouldApplyLobbySearchFromUrl('', first.syncedSearch)).toBe(false)
		})
	})

	describe('initialLobbySyncedSearch', () => {
		it('returns the initial page search unchanged', () => {
			expect(initialLobbySyncedSearch('')).toBe('')
			expect(initialLobbySyncedSearch('?era=preww1&timer=30&lives=3')).toBe(
				'?era=preww1&timer=30&lives=3'
			)
		})
	})

	describe('resolveLobbyUrlPush', () => {
		it('pushes default timer/lives query from bare lobby URL', () => {
			expect(resolveLobbyUrlPush('', DEFAULT_GAME_SETTINGS)).toEqual({
				targetSearch: '?timer=30&lives=3',
				href: '/?timer=30&lives=3',
				shouldReplace: true,
				syncedSearch: '?timer=30&lives=3'
			})
		})

		it('skips replace when URL already matches settings', () => {
			const result = resolveLobbyUrlPush('?timer=30&lives=3', DEFAULT_GAME_SETTINGS)
			expect(result.shouldReplace).toBe(false)
			expect(result.syncedSearch).toBe('?timer=30&lives=3')
		})

		it('includes era in pushed href when not modern', () => {
			const settings = {
				...DEFAULT_GAME_SETTINGS,
				eraId: CE1300_ERA_ID,
				timerEnabled: false,
				maxLives: 5
			}
			expect(resolveLobbyUrlPush('', settings)).toEqual({
				targetSearch: '?era=ce1300&timer=0&lives=5',
				href: '/?era=ce1300&timer=0&lives=5',
				shouldReplace: true,
				syncedSearch: '?era=ce1300&timer=0&lives=5'
			})
		})
	})

	describe('shouldSwitchMapEraFromUrl', () => {
		it('returns era id when URL era differs from current', () => {
			expect(shouldSwitchMapEraFromUrl({ eraId: CE1300_ERA_ID }, DEFAULT_ERA_ID)).toBe(
				CE1300_ERA_ID
			)
		})

		it('returns null when era matches or is absent', () => {
			expect(shouldSwitchMapEraFromUrl({ eraId: DEFAULT_ERA_ID }, DEFAULT_ERA_ID)).toBeNull()
			expect(shouldSwitchMapEraFromUrl({ timerEnabled: false }, DEFAULT_ERA_ID)).toBeNull()
			expect(shouldSwitchMapEraFromUrl(null, DEFAULT_ERA_ID)).toBeNull()
		})

		it('returns null for timer-only URL changes', () => {
			expect(
				shouldSwitchMapEraFromUrl(
					parseLobbySearchSync('?timer=60&lives=5').settings,
					PREWW1_ERA_ID
				)
			).toBeNull()
		})
	})
})
