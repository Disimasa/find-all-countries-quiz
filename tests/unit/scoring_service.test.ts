import { describe, expect, it } from 'vitest'
import { ScoringService } from '@domain/services/scoring_service'
import { IdentifyByNameMode } from '@domain/modes'
import { LivesService } from '@domain/services/lives_service'

describe('ScoringService', () => {
	const scoring = new ScoringService()

	it('normalizes accents and case', () => {
		expect(scoring.normalize('  Türkiye ')).toBe('turkiye')
	})

	it('resolves alias to entity id', () => {
		const aliases = new Map([['US', ['United States', 'USA']]])
		expect(scoring.resolveEntityId('usa', aliases)).toBe('US')
	})
})

describe('IdentifyByNameMode', () => {
	const mode = new IdentifyByNameMode()

	it('accepts correct answer', () => {
		const result = mode.evaluateAnswer({ selectedId: 'DE', submittedId: 'DE' }, 3)
		expect(result.correct).toBe(true)
	})

	it('rejects wrong answer', () => {
		const result = mode.evaluateAnswer({ selectedId: 'DE', submittedId: 'FR' }, 3)
		expect(result.correct).toBe(false)
	})
})

describe('LivesService', () => {
	it('decrements lives when enabled', () => {
		const lives = new LivesService(true, 3)
		expect(lives.loseLife()).toBe(2)
		expect(lives.isExhausted()).toBe(false)
	})

	it('does not decrement when disabled', () => {
		const lives = new LivesService(false, 3)
		expect(lives.loseLife()).toBe(3)
	})
})
