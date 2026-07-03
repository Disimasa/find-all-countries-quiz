export interface EraDecorations {
	paperGrain?: boolean
	exploreLabelSerif?: boolean
	lobbyPanelTint?: string
}

export interface EraThemeProfile {
	id: string
	decorations: EraDecorations
}

export const ERA_THEMES_ENABLED = true

export const ERA_THEME_PROFILES: Record<string, EraThemeProfile> = {
	modern: { id: 'modern', decorations: {} },
	parchment: {
		id: 'parchment',
		decorations: {
			paperGrain: true,
			exploreLabelSerif: true,
			lobbyPanelTint: '#f5efe4'
		}
	}
}

export function getEraThemeProfile(profileId: string): EraThemeProfile {
	return ERA_THEME_PROFILES[profileId] ?? ERA_THEME_PROFILES.modern
}
