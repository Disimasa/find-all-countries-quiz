import { get, writable } from 'svelte/store'
import { openDialog } from 'svelte-awaitable-dialog'
import { EMPTY_SNAPSHOT, GameSessionFactory, type GameSession } from '@domain/session'
import type { GameConfig, GameSnapshot, GeoEntity } from '@domain/entities'
import { getLocale, messages } from '@i18n'
import { parseConfig } from './parse_config.ts'
import GameOverModal from './ui/GameOverModal.svelte'

export { parseConfig } from './parse_config.ts'

export const gameSnapshot = writable<GameSnapshot>(EMPTY_SNAPSHOT)
export const autocompleteResults = writable<GeoEntity[]>([])
export const mapResetTick = writable(0)

let session: GameSession | null = null
let unsubscribe: (() => void) | null = null
let gameOverShown = false

export async function startGame(config: GameConfig): Promise<void> {
	destroyGame()
	gameOverShown = false
	session = GameSessionFactory.create({ config })
	session.setLocale(getLocale())
	unsubscribe = session.subscribe((snapshot) => {
		gameSnapshot.set(snapshot)
		if ((snapshot.status === 'won' || snapshot.status === 'lost') && !gameOverShown) {
			gameOverShown = true
			const m = messages[snapshot.locale]
			void openDialog(GameOverModal, {
				snapshot,
				victoryTitle: m.victory,
				gameOverTitle: m.gameOver,
				playAgainLabel: m.playAgain,
				homeLabel: m.home
			})
		}
	})
	await session.start()
}

export function destroyGame(): void {
	session?.destroy()
	unsubscribe?.()
	unsubscribe = null
	session = null
	gameSnapshot.set(EMPTY_SNAPSHOT)
}

export function selectCountry(id: string): void {
	session?.selectEntity(id)
}

export function clearSelection(): void {
	session?.clearSelection()
}

export function resetMapView(): void {
	mapResetTick.update((n) => n + 1)
}

export function submitGuess(entityId: string): void {
	session?.submitEntityId(entityId)
}

export function submitGuessText(text: string): void {
	session?.submitAnswer(text)
}

export function updateAutocomplete(query: string): void {
	if (!session) {
		autocompleteResults.set([])
		return
	}
	autocompleteResults.set(session.getAutocomplete(query))
}

export function getSession(): GameSession | null {
	return session
}

export function formatTime(seconds: number | null): string {
	if (seconds === null) return '—'
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

export function getFlagEmoji(entity: GeoEntity): string {
	const code = entity.flagCode
	if (!code || code.length !== 2) return ''
	return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)))
}

export function getEntityName(entity: GeoEntity): string {
	const snap = get(gameSnapshot)
	return entity.names[snap.locale]
}
