import { describe, expect, it, vi } from 'vitest'

const ROUTER_NOT_READY = 'Cannot call replaceState(...) before router is initialized'

vi.mock('$app/navigation', () => ({
	replaceState: vi.fn()
}))

import { replaceState } from '$app/navigation'
import { safeReplaceState } from '../../src/routes/safe_replace_state.ts'

describe('safeReplaceState', () => {
	it('retries until SvelteKit router is ready', async () => {
		vi.mocked(replaceState)
			.mockImplementationOnce(() => {
				throw new Error(ROUTER_NOT_READY)
			})
			.mockImplementationOnce(() => {
				throw new Error(ROUTER_NOT_READY)
			})
			.mockImplementation(() => undefined)

		await safeReplaceState('/?timer=30&lives=3', {})

		expect(replaceState).toHaveBeenCalledTimes(3)
		expect(replaceState).toHaveBeenLastCalledWith('/?timer=30&lives=3', {})
	})

	it('rethrows unexpected navigation errors', async () => {
		vi.mocked(replaceState).mockImplementation(() => {
			throw new Error('navigation failed')
		})

		await expect(safeReplaceState('/?timer=30&lives=3', {})).rejects.toThrow('navigation failed')
	})
})
