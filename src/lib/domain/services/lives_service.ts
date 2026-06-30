import { MAX_LIVES } from '@domain/session/constants'

export class LivesService {
	private remaining: number

	constructor(
		private readonly enabled: boolean,
		maxLives = MAX_LIVES
	) {
		this.remaining = maxLives
	}

	loseLife(): number {
		if (!this.enabled) return this.remaining
		this.remaining = Math.max(0, this.remaining - 1)
		return this.remaining
	}

	getRemaining(): number {
		return this.enabled ? this.remaining : MAX_LIVES
	}

	setRemaining(value: number): void {
		this.remaining = Math.max(0, Math.min(value, MAX_LIVES))
	}

	isExhausted(): boolean {
		return this.enabled && this.remaining <= 0
	}
}
