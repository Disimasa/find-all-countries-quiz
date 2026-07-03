import type { GameSnapshot } from '@domain/entities'
import type { EntityVisualState } from '@domain/entities'

export function resolveHoverableCountryId(
	id: string | null | undefined,
	guessedIds: ReadonlySet<string>,
	selectedId: string | null = null
): string | null {
	if (!id || guessedIds.has(id) || id === selectedId) return null
	return id
}

export function resolveGuessedTooltipId(
	id: string | null | undefined,
	guessedIds: ReadonlySet<string>
): string | null {
	if (!id || !guessedIds.has(id)) return null
	return id
}

export function baseCountryVisual(
	id: string,
	snapshot: Pick<GameSnapshot, 'guessedIds' | 'selectedId'> | null
): EntityVisualState {
	if (!snapshot) return 'default'
	if (snapshot.guessedIds.has(id)) return 'guessed'
	if (snapshot.selectedId === id) return 'selected'
	return 'default'
}

export function countryVisual(
	id: string,
	snapshot: Pick<GameSnapshot, 'guessedIds' | 'selectedId'> | null,
	hoveredId: string | null
): EntityVisualState {
	const base = baseCountryVisual(id, snapshot)
	if (base !== 'default') return base
	if (hoveredId === id) return 'hover'
	return 'default'
}
