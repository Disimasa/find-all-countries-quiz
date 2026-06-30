import type { GameStatus } from '@domain/entities'

type GameEventType = 'start' | 'loaded' | 'won' | 'lost'

interface GameEvent {
	type: GameEventType
}

const TRANSITIONS: Partial<Record<GameStatus, Partial<Record<GameEventType, GameStatus>>>> = {
	idle: { start: 'loading' },
	loading: { loaded: 'playing', lost: 'lost' },
	playing: { won: 'won', lost: 'lost' }
}

export class GameStateMachine {
	private status: GameStatus = 'idle'

	getStatus(): GameStatus {
		return this.status
	}

	transition(event: GameEvent): void {
		const next = TRANSITIONS[this.status]?.[event.type]
		if (!next) {
			throw new Error(`Invalid transition: ${this.status} -> ${event.type}`)
		}
		this.status = next
	}

	reset(): void {
		this.status = 'idle'
	}
}
