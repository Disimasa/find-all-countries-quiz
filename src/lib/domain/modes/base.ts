import type { AnswerContext, AnswerResult, ModeContext, ModePrompt } from '@domain/entities'

export abstract class BaseGameMode {
	abstract readonly id: string

	abstract getPrompt(ctx: ModeContext): ModePrompt

	abstract evaluateAnswer(ctx: AnswerContext, livesRemaining: number): AnswerResult
}
