import { describe, expect, it } from 'vitest'
import { planLobbyMarkerPlacement } from '@lobby-teaser'

describe('lobby_marker_placement', () => {
	it('first mount sets lng/lat and adds marker before replay, reveals after exit', () => {
		expect(planLobbyMarkerPlacement(true)).toEqual([
			{ phase: 'before-replay', type: 'set-lng-lat' },
			{ phase: 'before-replay', type: 'add-to-map' },
			{ phase: 'after-exit', type: 'reveal' }
		])
	})

	it('subsequent mounts move marker and reveal only after exit', () => {
		expect(planLobbyMarkerPlacement(false)).toEqual([
			{ phase: 'after-exit', type: 'set-lng-lat' },
			{ phase: 'after-exit', type: 'reveal' }
		])
	})

	it('executes first-mount actions in exit → setLngLat → enter order', async () => {
		const log: string[] = []
		const plan = planLobbyMarkerPlacement(true)

		const runAfterExit = async () => {
			for (const action of plan) {
				if (action.phase !== 'after-exit') continue
				if (action.type === 'set-lng-lat') log.push('set-lng-lat')
				if (action.type === 'reveal') log.push('reveal')
			}
		}

		for (const action of plan) {
			if (action.phase !== 'before-replay') continue
			if (action.type === 'set-lng-lat') log.push('set-lng-lat')
			if (action.type === 'add-to-map') log.push('add-to-map')
		}

		log.push('exit')
		await runAfterExit()
		log.push('enter')

		expect(log).toEqual(['set-lng-lat', 'add-to-map', 'exit', 'reveal', 'enter'])
	})

	it('executes subsequent-mount actions after exit only', async () => {
		const log: string[] = []
		const plan = planLobbyMarkerPlacement(false)

		log.push('exit')
		for (const action of plan) {
			if (action.phase !== 'after-exit') continue
			if (action.type === 'set-lng-lat') log.push('set-lng-lat')
			if (action.type === 'reveal') log.push('reveal')
		}
		log.push('enter')

		expect(log).toEqual(['exit', 'set-lng-lat', 'reveal', 'enter'])
	})
})
