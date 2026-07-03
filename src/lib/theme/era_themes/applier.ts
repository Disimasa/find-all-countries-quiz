import { MODERN_ERA_ID, MapEraRegistry } from '@domain/maps'
import {
	ERA_THEMES_ENABLED,
	getEraThemeProfile,
	type EraThemeProfile
} from './registry.ts'

export function applyMapEraTheme(eraId: string, root: HTMLElement): EraThemeProfile {
	const profileId = ERA_THEMES_ENABLED
		? MapEraRegistry.resolveThemeProfileId(eraId)
		: 'modern'
	const profile = getEraThemeProfile(profileId)

	if (!ERA_THEMES_ENABLED || eraId === MODERN_ERA_ID) {
		delete root.dataset.mapEra
	} else {
		root.dataset.mapEra = eraId
	}

	return profile
}

export function getActiveEraThemeProfile(eraId: string): EraThemeProfile {
	if (!ERA_THEMES_ENABLED) return getEraThemeProfile('modern')
	return getEraThemeProfile(MapEraRegistry.resolveThemeProfileId(eraId))
}

export type { EraDecorations, EraThemeProfile } from './registry.ts'
export { ERA_THEMES_ENABLED, getEraThemeProfile } from './registry.ts'
