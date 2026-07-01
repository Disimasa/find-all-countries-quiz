import type { GameConfig, GameSnapshot } from '@domain/entities'

export type LossReason = 'time' | 'lives'

export interface GameOverSummary {
	readonly percent: number
	readonly correct: number
	readonly total: number
	readonly wrongCount: number
	readonly lossReason: LossReason | null
	readonly elapsedSeconds: number | null
	readonly timeRemaining: number | null
	readonly timerEnabled: boolean
	readonly livesEnabled: boolean
	readonly timerSeconds: number
	readonly maxLives: number
}

export function computeProgressPercent(correct: number, total: number): number {
	if (total <= 0) return 0
	return Math.round((correct / total) * 100)
}

export function computeElapsedSeconds(
	timerEnabled: boolean,
	timerSeconds: number,
	timeRemaining: number | null
): number | null {
	if (!timerEnabled || timeRemaining === null) return null
	return Math.max(0, timerSeconds - timeRemaining)
}

export function inferLossReason(snapshot: GameSnapshot, config: GameConfig): LossReason | null {
	if (snapshot.status !== 'lost') return null

	if (config.livesEnabled && snapshot.stats.lives === 0) {
		return 'lives'
	}

	if (config.timerEnabled && snapshot.stats.timeRemaining === 0) {
		return 'time'
	}

	return null
}

export function buildGameOverSummary(snapshot: GameSnapshot, config: GameConfig): GameOverSummary {
	const { correct, total } = snapshot.progress

	return {
		percent: computeProgressPercent(correct, total),
		correct,
		total,
		wrongCount: snapshot.stats.wrongCount,
		lossReason: inferLossReason(snapshot, config),
		elapsedSeconds: computeElapsedSeconds(
			config.timerEnabled,
			config.timerSeconds,
			snapshot.stats.timeRemaining
		),
		timeRemaining: config.timerEnabled ? snapshot.stats.timeRemaining : null,
		timerEnabled: config.timerEnabled,
		livesEnabled: config.livesEnabled,
		timerSeconds: config.timerSeconds,
		maxLives: config.maxLives
	}
}
