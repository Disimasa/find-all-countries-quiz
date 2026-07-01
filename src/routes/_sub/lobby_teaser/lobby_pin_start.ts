import { writable } from 'svelte/store'

export interface LobbyPinStartCta {
	label: string
	onStart: () => void
}

export const lobbyPinStartCta = writable<LobbyPinStartCta | null>(null)
