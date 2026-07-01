import { describe, expect, it } from 'vitest'
import { GameStateMachine } from '@domain/state'

describe('GameStateMachine', () => {
	it('transitions loading to error on load failure', () => {
		const machine = new GameStateMachine()
		machine.transition({ type: 'start' })
		expect(machine.getStatus()).toBe('loading')
		machine.transition({ type: 'loadFailed' })
		expect(machine.getStatus()).toBe('error')
	})

	it('rejects loadFailed outside loading', () => {
		const machine = new GameStateMachine()
		expect(() => machine.transition({ type: 'loadFailed' })).toThrow()
	})
})
