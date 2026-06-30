import { vi } from 'vitest'

export function installLocalStorageMock(): Record<string, string> {
	const store: Record<string, string> = {}

	vi.stubGlobal('localStorage', {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value
		},
		removeItem: (key: string) => {
			delete store[key]
		}
	})

	return store
}
