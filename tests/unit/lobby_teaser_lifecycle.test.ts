import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import { getLobbyTeaserEpoch, isLobbyTeaserRunning, stopLobbyTeaser } from '@lobby-teaser'
import { lobbyPinStartCta } from '../../src/routes/_sub/lobby_teaser/lobby_pin_start.ts'

describe('lobby_teaser_lifecycle', () => {
	beforeEach(() => {
		stopLobbyTeaser()
	})

	it('increments epoch on stop to invalidate stale async work', () => {
		const before = getLobbyTeaserEpoch()
		stopLobbyTeaser()
		expect(getLobbyTeaserEpoch()).toBe(before + 1)
	})

	it('resets running state on stop', () => {
		stopLobbyTeaser()
		expect(isLobbyTeaserRunning()).toBe(false)
	})

	it('clears start CTA on stop', () => {
		lobbyPinStartCta.set({ label: 'New game', onStart: () => {} })
		stopLobbyTeaser()
		expect(get(lobbyPinStartCta)).toBeNull()
	})
})
