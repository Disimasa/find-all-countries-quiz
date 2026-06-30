import { describe, expect, it, vi } from 'vitest'
import { runPinTransitionWithLog } from '@lobby-teaser/ui/lobby-pin/lobby_pin_transition'

describe('lobby_pin_transition', () => {
	it('runs exit → after-exit → enter when body is visible', async () => {
		const exit = vi.fn()
		const afterExit = vi.fn()
		const enter = vi.fn()

		const result = await runPinTransitionWithLog('visible', true, {
			exit,
			afterExit,
			enter
		})

		expect(result.log).toEqual(['exit', 'after-exit', 'enter'])
		expect(result.phase).toBe('visible')
		expect(exit).toHaveBeenCalledBefore(afterExit)
		expect(afterExit).toHaveBeenCalledBefore(enter)
	})

	it('skips exit on first mount from idle', async () => {
		const exit = vi.fn()
		const afterExit = vi.fn()
		const enter = vi.fn()

		const result = await runPinTransitionWithLog('idle', true, {
			exit,
			afterExit,
			enter
		})

		expect(result.log).toEqual(['after-exit', 'enter'])
		expect(exit).not.toHaveBeenCalled()
	})

	it('skips exit when body element is missing', async () => {
		const exit = vi.fn()

		const result = await runPinTransitionWithLog('visible', false, {
			exit,
			afterExit: () => {},
			enter: () => {}
		})

		expect(result.log).toEqual(['after-exit', 'enter'])
		expect(exit).not.toHaveBeenCalled()
	})

	it('awaits async afterExit before enter', async () => {
		const log: string[] = []

		await runPinTransitionWithLog('idle', false, {
			afterExit: async () => {
				await new Promise((resolve) => setTimeout(resolve, 5))
				log.push('after-exit')
			},
			enter: () => {
				log.push('enter')
			}
		})

		expect(log).toEqual(['after-exit', 'enter'])
	})
})
