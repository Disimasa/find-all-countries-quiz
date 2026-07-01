import type {
	AnswerResult,
	GameConfig,
	GameSnapshot,
	Locale,
	SessionListener
} from '@domain/entities'
import type { BaseMapEra } from '@domain/maps'
import type { BaseGameMode } from '@domain/modes'
import { GameStateMachine } from '@domain/state'
import { LivesService } from '@domain/services/lives_service'
import { TimerService } from '@domain/services/timer_service'
import { AutocompleteService } from '@domain/services/autocomplete_service'
import { ScoringService } from '@domain/services/scoring_service'

const EMPTY_SNAPSHOT: GameSnapshot = {
	status: 'idle',
	guessedIds: new Set(),
	selectedId: null,
	prompt: null,
	progress: { correct: 0, total: 0 },
	lives: 3,
	maxLives: 3,
	livesEnabled: true,
	wrongCount: 0,
	timeRemaining: null,
	locale: 'en'
}

export class GameSession {
	private readonly stateMachine = new GameStateMachine()
	private readonly autocomplete = new AutocompleteService()
	private readonly scoring = new ScoringService()
	private readonly timer: TimerService
	private readonly lives: LivesService
	private readonly guessedIds = new Set<string>()
	private wrongCount = 0
	private selectedId: string | null = null
	private listeners = new Set<SessionListener>()
	private locale: Locale = 'en'

	constructor(
		private readonly era: BaseMapEra,
		private readonly mode: BaseGameMode,
		private readonly config: GameConfig
	) {
		this.timer = new TimerService(config.timerEnabled, config.timerSeconds)
		this.lives = new LivesService(config.livesEnabled, config.maxLives)
	}

	setLocale(locale: Locale): void {
		this.locale = locale
		this.emit()
	}

	subscribe(listener: SessionListener): () => void {
		this.listeners.add(listener)
		listener(this.getSnapshot())
		return () => this.listeners.delete(listener)
	}

	async start(restore?: { guessedIds: string[]; livesRemaining: number; timeRemaining: number | null }): Promise<void> {
		this.stateMachine.reset()
		this.guessedIds.clear()
		this.wrongCount = 0
		this.selectedId = null

		if (restore) {
			for (const id of restore.guessedIds) this.guessedIds.add(id)
			if (restore.timeRemaining !== null) {
				this.timer.setRemaining(restore.timeRemaining)
			}
			this.lives.setRemaining(restore.livesRemaining)
		}

		if (this.era.isInitialized()) {
			this.stateMachine.transition({ type: 'start' })
			this.stateMachine.transition({ type: 'loaded' })
			this.timer.start(() => this.onTimerTick())
			this.emit()
			return
		}

		this.stateMachine.transition({ type: 'start' })
		this.emit()

		try {
			const { GeoJsonLoader } = await import('@infrastructure/data/geo_json_loader')
			await this.era.initialize(new GeoJsonLoader())
			this.stateMachine.transition({ type: 'loaded' })
			this.timer.start(() => this.onTimerTick())
			this.emit()
		} catch {
			this.stateMachine.transition({ type: 'lost' })
			this.emit()
		}
	}

	destroy(): void {
		this.timer.stop()
	}

	selectEntity(id: string): void {
		if (this.stateMachine.getStatus() !== 'playing' || this.guessedIds.has(id)) return
		this.selectedId = id
		this.emit()
	}

	clearSelection(): void {
		this.selectedId = null
		this.emit()
	}

	selectRandomUnguessedEntity(): string | null {
		if (this.stateMachine.getStatus() !== 'playing') return null

		const pool = this.era
			.getAllEntities()
			.map((entity) => entity.id)
			.filter((id) => !this.guessedIds.has(id))

		if (pool.length === 0) return null

		const candidates =
			this.selectedId && pool.length > 1
				? pool.filter((id) => id !== this.selectedId)
				: pool

		const id = candidates[Math.floor(Math.random() * candidates.length)]!
		this.selectedId = id
		this.emit()
		return id
	}

	submitAnswer(answerText: string): AnswerResult | null {
		if (!this.selectedId || this.stateMachine.getStatus() !== 'playing') return null

		const aliases = this.getAliasMap()
		const submittedId = this.scoring.resolveEntityId(answerText, aliases, this.locale)
		if (!submittedId) return null

		return this.applyAnswer(submittedId)
	}

	submitEntityId(submittedId: string): AnswerResult | null {
		if (!this.selectedId || this.stateMachine.getStatus() !== 'playing') return null
		return this.applyAnswer(submittedId)
	}

	private applyAnswer(submittedId: string): AnswerResult {
		let livesRemaining = this.lives.getRemaining()
		const selectedId = this.selectedId!
		const result = this.mode.evaluateAnswer({ selectedId, submittedId }, livesRemaining)

		if (result.correct) {
			this.guessedIds.add(selectedId)
			this.selectedId = null
			if (this.guessedIds.size >= this.era.getAllEntities().length) {
				this.stateMachine.transition({ type: 'won' })
			}
		} else {
			this.wrongCount += 1
			livesRemaining = this.lives.loseLife()
			if (this.lives.isExhausted()) {
				this.stateMachine.transition({ type: 'lost' })
			}
		}

		this.emit()
		return { ...result, livesRemaining }
	}

	getSnapshot(): GameSnapshot {
		const total = this.era.getAllEntities().length
		return {
			status: this.stateMachine.getStatus(),
			guessedIds: new Set(this.guessedIds),
			selectedId: this.selectedId,
			prompt:
				this.selectedId && this.stateMachine.getStatus() === 'playing'
					? this.mode.getPrompt({ selectedId: this.selectedId, locale: this.locale })
					: null,
			progress: { correct: this.guessedIds.size, total },
			lives: this.lives.getRemaining(),
			maxLives: this.config.maxLives,
			livesEnabled: this.config.livesEnabled,
			wrongCount: this.wrongCount,
			timeRemaining: this.timer.getRemaining(),
			locale: this.locale
		}
	}

	getEra(): BaseMapEra {
		return this.era
	}

	getAutocomplete(query: string) {
		return this.autocomplete.filter(
			query,
			this.era.getAllEntities(),
			this.locale,
			this.guessedIds,
			this.getAliasMap()
		)
	}

	private getAliasMap(): Map<string, string[]> {
		const map = new Map<string, string[]>()
		for (const entity of this.era.getAllEntities()) {
			map.set(entity.id, this.era.getAliases(entity.id, this.locale))
		}
		return map
	}

	private onTimerTick(): void {
		if (this.timer.isExpired() && this.stateMachine.getStatus() === 'playing') {
			this.stateMachine.transition({ type: 'lost' })
		}
		this.emit()
	}

	private emit(): void {
		const snapshot = this.getSnapshot()
		for (const listener of this.listeners) listener(snapshot)
	}
}

export { EMPTY_SNAPSHOT }
