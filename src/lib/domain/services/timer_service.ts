import { DEFAULT_TIMER_SECONDS } from '@domain/session/constants'

export class TimerService {
	private remaining: number
	private intervalId: ReturnType<typeof setInterval> | null = null
	private onTick: ((remaining: number) => void) | null = null

	constructor(
		private readonly enabled: boolean,
		initialSeconds = DEFAULT_TIMER_SECONDS
	) {
		this.remaining = initialSeconds
	}

	start(onTick: (remaining: number) => void): void {
		if (!this.enabled) return
		this.onTick = onTick
		this.intervalId = setInterval(() => {
			this.remaining -= 1
			this.onTick?.(this.remaining)
			if (this.remaining <= 0) {
				this.stop()
			}
		}, 1000)
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	getRemaining(): number | null {
		return this.enabled ? this.remaining : null
	}

	isExpired(): boolean {
		return this.enabled && this.remaining <= 0
	}
}
