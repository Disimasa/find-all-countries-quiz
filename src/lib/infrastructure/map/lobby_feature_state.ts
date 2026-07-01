import type { EntityVisualState } from '@domain/entities'

export function lobbyCountryVisual(
	countryId: string,
	pickedId: string | null,
	hintId: string | null
): EntityVisualState {
	if (countryId === pickedId || countryId === hintId) return 'selected'
	return 'default'
}

export function lobbyHoverableCountryId(
	id: string | null | undefined,
	pickedId: string | null,
	hintId: string | null
): string | null {
	if (!id) return null
	if (id === pickedId || id === hintId) return null
	return id
}
