import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameConfig } from '@domain/entities'
import { IdentifyByNameMode } from '@domain/modes'
import { GameSession } from '@domain/session'
import { createStubMapEra, STUB_ENTITIES } from './helpers/stub_map_era.ts'

const defaultConfig: GameConfig = {
	timerEnabled: false,
	timerSeconds: 60,
	livesEnabled: true,
	maxLives: 3
}

function createSession(config: Partial<GameConfig> = {}): GameSession {
	const era = createStubMapEra(STUB_ENTITIES, {
		DE: ['Germany', 'Deutschland'],
		FR: ['France', 'Франция'],
		PL: ['Poland', 'Polska']
	})
	return new GameSession(era, new IdentifyByNameMode(), { ...defaultConfig, ...config })
}

describe('GameSession', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('starts in playing state when era is pre-initialized', async () => {
		const session = createSession()
		await session.start()

		const snapshot = session.getSnapshot()
		expect(snapshot.status).toBe('playing')
		expect(snapshot.progress.total).toBe(3)
		expect(snapshot.progress.correct).toBe(0)
		expect(snapshot.lives).toBe(3)
		expect(snapshot.livesEnabled).toBe(true)
	})

	it('restores guessed ids, lives and timer on start', async () => {
		const session = createSession({ timerEnabled: true, timerSeconds: 120, maxLives: 5 })
		await session.start({
			guessedIds: ['DE'],
			livesRemaining: 2,
			timeRemaining: 90
		})

		const snapshot = session.getSnapshot()
		expect(snapshot.guessedIds).toEqual(new Set(['DE']))
		expect(snapshot.lives).toBe(2)
		expect(snapshot.timeRemaining).toBe(90)
		expect(snapshot.progress.correct).toBe(1)
	})

	it('selects and clears entity', async () => {
		const session = createSession()
		await session.start()

		session.selectEntity('FR')
		expect(session.getSnapshot().selectedId).toBe('FR')
		expect(session.getSnapshot().prompt).toEqual({ type: 'type-name', selectedId: 'FR' })

		session.clearSelection()
		expect(session.getSnapshot().selectedId).toBeNull()
		expect(session.getSnapshot().prompt).toBeNull()
	})

	it('ignores selection of guessed entity', async () => {
		const session = createSession()
		await session.start({ guessedIds: ['DE'], livesRemaining: 3, timeRemaining: null })

		session.selectEntity('DE')
		expect(session.getSnapshot().selectedId).toBeNull()
	})

	it('accepts correct answer by text', async () => {
		const session = createSession()
		await session.start()
		session.selectEntity('DE')

		const result = session.submitAnswer('Germany')
		expect(result?.correct).toBe(true)
		expect(session.getSnapshot().guessedIds).toEqual(new Set(['DE']))
		expect(session.getSnapshot().selectedId).toBeNull()
		expect(session.getSnapshot().progress.correct).toBe(1)
	})

	it('rejects wrong answer and decrements lives', async () => {
		const session = createSession()
		await session.start()
		session.selectEntity('DE')

		const result = session.submitAnswer('France')
		expect(result?.correct).toBe(false)
		expect(result?.livesRemaining).toBe(2)
		expect(session.getSnapshot().lives).toBe(2)
		expect(session.getSnapshot().selectedId).toBe('DE')
	})

	it('returns null for unknown answer text', async () => {
		const session = createSession()
		await session.start()
		session.selectEntity('DE')

		expect(session.submitAnswer('Atlantis')).toBeNull()
	})

	it('wins when all entities are guessed', async () => {
		const session = createSession()
		await session.start()

		for (const entity of STUB_ENTITIES) {
			session.selectEntity(entity.id)
			session.submitEntityId(entity.id)
		}

		expect(session.getSnapshot().status).toBe('won')
		expect(session.getSnapshot().progress.correct).toBe(3)
	})

	it('loses when lives are exhausted', async () => {
		const session = createSession({ maxLives: 1 })
		await session.start()
		session.selectEntity('DE')

		session.submitAnswer('France')
		expect(session.getSnapshot().status).toBe('lost')
	})

	it('does not lose lives when lives mode is disabled', async () => {
		const session = createSession({ livesEnabled: false })
		await session.start()
		session.selectEntity('DE')

		session.submitAnswer('France')
		const snapshot = session.getSnapshot()
		expect(snapshot.status).toBe('playing')
		expect(snapshot.livesEnabled).toBe(false)
		expect(snapshot.lives).toBe(3)
	})

	it('expires timer and transitions to lost', async () => {
		const session = createSession({ timerEnabled: true, timerSeconds: 2 })
		await session.start()

		vi.advanceTimersByTime(2000)
		expect(session.getSnapshot().status).toBe('lost')
		expect(session.getSnapshot().timeRemaining).toBe(0)
	})

	it('picks a random unguessed entity', async () => {
		const session = createSession()
		await session.start({ guessedIds: ['DE'], livesRemaining: 3, timeRemaining: null })

		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
		const id = session.selectRandomUnguessedEntity()

		expect(id).toBe('FR')
		expect(session.getSnapshot().selectedId).toBe('FR')
		randomSpy.mockRestore()
	})

	it('notifies subscribers on changes', async () => {
		const session = createSession()
		const listener = vi.fn()
		const unsubscribe = session.subscribe(listener)

		await session.start()
		session.selectEntity('PL')

		expect(listener).toHaveBeenCalled()
		const lastCall = listener.mock.calls.at(-1)?.[0]
		expect(lastCall?.selectedId).toBe('PL')

		unsubscribe()
		session.clearSelection()
		expect(listener.mock.calls.at(-1)?.[0]?.selectedId).toBe('PL')
	})

	it('updates locale in snapshot', async () => {
		const session = createSession()
		await session.start()
		session.setLocale('ru')
		expect(session.getSnapshot().locale).toBe('ru')
	})

	it('filters autocomplete by locale aliases', async () => {
		const session = createSession()
		await session.start()
		session.setLocale('en')

		expect(session.getAutocomplete('ger')).toHaveLength(1)
		expect(session.getAutocomplete('ger')[0]?.id).toBe('DE')
	})
})
