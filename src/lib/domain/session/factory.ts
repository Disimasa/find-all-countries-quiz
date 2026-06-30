import type { GameConfig } from '@domain/entities'
import { MapEraRegistry, MODERN_ERA_ID, type BaseMapEra } from '@domain/maps'
import { GameModeRegistry, IDENTIFY_BY_NAME_MODE_ID } from '@domain/modes'
import { DEFAULT_TIMER_SECONDS, MAX_LIVES } from './constants.ts'
import { GameSession } from './session.ts'

export interface SessionOptions {
	era?: BaseMapEra
	eraId?: string
	modeId?: string
	config?: Partial<GameConfig>
}

export class GameSessionFactory {
	static create(options: SessionOptions = {}): GameSession {
		const era = options.era ?? MapEraRegistry.create(options.eraId ?? MODERN_ERA_ID)
		const mode = GameModeRegistry.create(options.modeId ?? IDENTIFY_BY_NAME_MODE_ID)
		const config: GameConfig = {
			timerEnabled: options.config?.timerEnabled ?? true,
			timerSeconds: options.config?.timerSeconds ?? DEFAULT_TIMER_SECONDS,
			livesEnabled: options.config?.livesEnabled ?? true,
			maxLives: options.config?.maxLives ?? MAX_LIVES
		}
		return new GameSession(era, mode, config)
	}
}
