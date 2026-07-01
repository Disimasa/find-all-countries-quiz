import { describe, expect, it } from 'vitest'
import type { GameConfig, GameSnapshot } from '@domain/entities'
import {
	buildGameOverSummary,
	computeElapsedSeconds,
	computeProgressPercent,
	inferLossReason
} from '../../src/routes/play/game_over_summary.ts'

const baseConfig: GameConfig = {
	timerEnabled: true,
	timerSeconds: 1800,
	livesEnabled: true,
	maxLives: 3
}

function snapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
	return {
		status: 'lost',
		guessedIds: new Set(),
		selectedId: null,
		prompt: null,
		progress: { correct: 45, total: 178 },
		stats: {
			lives: 0,
			maxLives: 3,
			livesEnabled: true,
			wrongCount: 12,
			timeRemaining: 600
		},
		locale: 'en',
		...overrides
	}
}

describe('computeProgressPercent', () => {
	it('rounds share of guessed countries', () => {
		expect(computeProgressPercent(45, 178)).toBe(25)
		expect(computeProgressPercent(178, 178)).toBe(100)
	})

	it('returns 0 for empty total', () => {
		expect(computeProgressPercent(0, 0)).toBe(0)
	})
})

describe('computeElapsedSeconds', () => {
	it('subtracts remaining time from configured limit', () => {
		expect(computeElapsedSeconds(true, 1800, 600)).toBe(1200)
	})

	it('returns null when timer is disabled', () => {
		expect(computeElapsedSeconds(false, 1800, 600)).toBeNull()
	})
})

describe('inferLossReason', () => {
	it('prefers exhausted lives over expired timer', () => {
		expect(
			inferLossReason(
				snapshot({
					stats: {
						lives: 0,
						maxLives: 3,
						livesEnabled: true,
						wrongCount: 3,
						timeRemaining: 0
					}
				}),
				baseConfig
			)
		).toBe('lives')
	})

	it('detects time loss when lives remain', () => {
		expect(
			inferLossReason(
				snapshot({
					stats: {
						lives: 2,
						maxLives: 3,
						livesEnabled: true,
						wrongCount: 1,
						timeRemaining: 0
					}
				}),
				baseConfig
			)
		).toBe('time')
	})

	it('returns null on victory', () => {
		expect(inferLossReason(snapshot({ status: 'won' }), baseConfig)).toBeNull()
	})
})

describe('buildGameOverSummary', () => {
	it('builds dashboard fields for a finished game', () => {
		const summary = buildGameOverSummary(snapshot(), baseConfig)

		expect(summary).toEqual({
			percent: 25,
			correct: 45,
			total: 178,
			wrongCount: 12,
			lossReason: 'lives',
			elapsedSeconds: 1200,
			timeRemaining: 600,
			timerEnabled: true,
			livesEnabled: true,
			timerSeconds: 1800,
			maxLives: 3
		})
	})

	it('omits timer fields when timer is off', () => {
		const summary = buildGameOverSummary(
			snapshot({
				stats: {
					lives: 0,
					maxLives: 3,
					livesEnabled: true,
					wrongCount: 3,
					timeRemaining: null
				}
			}),
			{ ...baseConfig, timerEnabled: false }
		)

		expect(summary.elapsedSeconds).toBeNull()
		expect(summary.timeRemaining).toBeNull()
	})
})
