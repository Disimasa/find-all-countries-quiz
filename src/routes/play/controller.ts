import { get } from 'svelte/store'
import type { GeoEntity } from '@domain/entities'
import { gameSnapshot } from '../game/session_bridge.ts'

export {
	gameSnapshot,
	autocompleteResults,
	mapResetTick,
	startGame,
	resumeGame,
	destroyGame,
	selectCountry,
	selectRandomCountry,
	clearSelection,
	resetMapView,
	submitGuess,
	submitGuessText,
	updateAutocomplete,
	warmupPlay,
	getSession
} from '../game/session_bridge.ts'

export { parseConfig } from './parse_config.ts'
export { getFlagEmoji } from '@shared/flag_emoji'

export function formatTime(seconds: number | null): string {
	if (seconds === null) return '—'
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

export function getEntityName(entity: GeoEntity): string {
	const snap = get(gameSnapshot)
	return entity.names[snap.locale]
}
