import type { AnswerContext, AnswerResult, ModeContext, ModePrompt } from '@domain/entities'
import { BaseGameMode } from '../base.ts'
import { IDENTIFY_BY_NAME_MODE_ID } from './constants.ts'

export class IdentifyByNameMode extends BaseGameMode {
	readonly id = IDENTIFY_BY_NAME_MODE_ID

	getPrompt(ctx: ModeContext): ModePrompt {
		return { type: 'type-name', selectedId: ctx.selectedId }
	}

	evaluateAnswer(ctx: AnswerContext, livesRemaining: number): AnswerResult {
		const correct = ctx.selectedId === ctx.submittedId
		return {
			correct,
			expectedId: ctx.selectedId,
			submittedId: ctx.submittedId,
			livesRemaining
		}
	}
}
