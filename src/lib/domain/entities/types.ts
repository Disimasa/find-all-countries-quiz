export type Locale = 'en' | 'ru'

export type GameStatus = 'idle' | 'loading' | 'playing' | 'won' | 'lost' | 'error'

export type EntityVisualState = 'default' | 'hover' | 'selected' | 'guessed' | 'wrong'

export type EntityType = 'country' | 'polity' | 'province'

export interface LocalizedNames {
	en: string
	ru: string
}

export interface GeoEntity {
	readonly id: string
	readonly names: LocalizedNames
	readonly region?: string
	readonly flagCode?: string
}

export interface EntityMetaRaw {
	id: string
	nameEn: string
	nameRu: string
	region?: string
	flagCode?: string
}

export interface GameConfig {
	readonly timerEnabled: boolean
	readonly timerSeconds: number
	readonly livesEnabled: boolean
	readonly maxLives: number
}

export interface AnswerResult {
	readonly correct: boolean
	readonly expectedId: string
	readonly submittedId: string
	readonly livesRemaining: number
}

export interface ModePrompt {
	readonly type: 'type-name'
	readonly selectedId: string
}

export interface GameStats {
	readonly lives: number
	readonly maxLives: number
	readonly livesEnabled: boolean
	readonly wrongCount: number
	readonly timeRemaining: number | null
}

export interface GameSnapshot {
	readonly status: GameStatus
	readonly guessedIds: ReadonlySet<string>
	readonly selectedId: string | null
	readonly prompt: ModePrompt | null
	readonly progress: { correct: number; total: number }
	readonly stats: GameStats
	readonly locale: Locale
}

export interface MapEraDescriptor {
	readonly id: string
	readonly year: number | null
	readonly entityType: EntityType
}

export interface GameModeDescriptor {
	readonly id: string
}

export type SessionListener = (snapshot: GameSnapshot) => void

export interface AnswerContext {
	readonly selectedId: string
	readonly submittedId: string
}

export interface ModeContext {
	readonly selectedId: string
	readonly locale: Locale
}

export interface PolygonStyle {
	fillColor: string
	fillOpacity: number
	weight: number
	color: string
}
