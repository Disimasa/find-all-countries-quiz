import { DEFAULT_MAX_LIVES } from '@domain/session/constants'

export class LivesService {
	private remaining: number

	constructor(
		private readonly enabled: boolean,
		private readonly maxLives = DEFAULT_MAX_LIVES
	) {
		this.remaining = maxLives
	}

	loseLife(): number {
		if (!this.enabled) return this.remaining
		this.remaining = Math.max(0, this.remaining - 1)
		return this.remaining
	}

	getRemaining(): number {
		return this.enabled ? this.remaining : this.maxLives
	}

	setRemaining(value: number): void {
		this.remaining = Math.max(0, Math.min(value, this.maxLives))
	}

	isExhausted(): boolean {
		return this.enabled && this.remaining <= 0
	}
}
