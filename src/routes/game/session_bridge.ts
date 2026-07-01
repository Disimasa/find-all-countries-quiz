import { writable } from 'svelte/store'
import { openDialog } from 'svelte-awaitable-dialog'
import { EMPTY_SNAPSHOT, GameSessionFactory, type GameSession } from '@domain/session'
import type { AnswerResult, GameConfig, GameSnapshot, GeoEntity } from '@domain/entities'
import { MODERN_ERA_ID } from '@domain/maps'
import { getLocale, messages } from '@i18n'
import { clearSavedGame, saveGame, type SavedGameProgress } from '@persist'
import { getSharedMapEra } from '../map_era.ts'
import GameOverModal from '../play/ui/GameOverModal.svelte'

export const gameSnapshot = writable<GameSnapshot>(EMPTY_SNAPSHOT)
export const autocompleteResults = writable<GeoEntity[]>([])
export const mapResetTick = writable(0)

let session: GameSession | null = null
let unsubscribe: (() => void) | null = null
let gameOverShown = false
let activeConfig: GameConfig | null = null

function persistSnapshot(snapshot: GameSnapshot): void {
	if (!activeConfig) return

	if (snapshot.status !== 'playing') {
		clearSavedGame()
		return
	}

	const progress: SavedGameProgress = {
		guessedIds: [...snapshot.guessedIds],
		livesRemaining: snapshot.stats.lives,
		timeRemaining: snapshot.stats.timeRemaining,
		total: snapshot.progress.total
	}

	saveGame({
		eraId: MODERN_ERA_ID,
		config: activeConfig,
		progress,
		savedAt: Date.now()
	})
}

function bindSession(nextSession: GameSession, config: GameConfig): void {
	session = nextSession
	activeConfig = config
	gameOverShown = false
	session.setLocale(getLocale())
	unsubscribe = session.subscribe((snapshot) => {
		gameSnapshot.set(snapshot)
		persistSnapshot(snapshot)
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
}

export async function startGame(config: GameConfig, resume?: SavedGameProgress): Promise<void> {
	destroyGame()
	if (!resume) clearSavedGame()

	const era = getSharedMapEra()
	const nextSession = GameSessionFactory.create({ config, era: era ?? undefined })
	bindSession(nextSession, config)
	await session!.start(resume)
}

export async function resumeGame(config: GameConfig, progress: SavedGameProgress): Promise<void> {
	await startGame(config, progress)
}

export function destroyGame(): void {
	if (session) {
		const snapshot = session.getSnapshot()
		if (snapshot.status === 'playing' && activeConfig) {
			persistSnapshot(snapshot)
		}
	}

	session?.destroy()
	unsubscribe?.()
	unsubscribe = null
	session = null
	activeConfig = null
	gameSnapshot.set(EMPTY_SNAPSHOT)
}

export function selectCountry(id: string): void {
	session?.selectEntity(id)
}

export function selectRandomCountry(): string | null {
	return session?.selectRandomUnguessedEntity() ?? null
}

export function clearSelection(): void {
	session?.clearSelection()
}

export function resetMapView(): void {
	mapResetTick.update((n) => n + 1)
}

export function submitGuess(entityId: string): AnswerResult | null {
	return session?.submitEntityId(entityId) ?? null
}

export function submitGuessText(text: string): AnswerResult | null {
	return session?.submitAnswer(text) ?? null
}

export function updateAutocomplete(query: string): void {
	if (!session) {
		autocompleteResults.set([])
		return
	}
	autocompleteResults.set(session.getAutocomplete(query))
}

/** Prefetch modules while the user is on the lobby so play starts without a loading flash. */
export function warmupPlay(): void {
	void import('@infrastructure/data/geo_json_loader')
}

export function getSession(): GameSession | null {
	return session
}
