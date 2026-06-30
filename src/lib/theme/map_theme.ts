import type { EntityVisualState, PolygonStyle } from '@domain/entities'

export type MapThemeStyles = Record<EntityVisualState, PolygonStyle>

export interface MapBasemapColors {
	readonly water: string
	readonly waterway: string
	readonly waterwayOpacity: number
}

const MAP_STATE_VARS: Record<
	EntityVisualState,
	{ fill: string; outline: string; opacity: string; weight: string }
> = {
	default: {
		fill: '--map-country-default',
		outline: '--map-country-default-outline',
		opacity: '--map-country-default-opacity',
		weight: '--map-country-default-weight'
	},
	hover: {
		fill: '--map-country-hover',
		outline: '--map-country-hover-outline',
		opacity: '--map-country-hover-opacity',
		weight: '--map-country-hover-weight'
	},
	selected: {
		fill: '--map-country-selected',
		outline: '--map-country-selected-outline',
		opacity: '--map-country-selected-opacity',
		weight: '--map-country-selected-weight'
	},
	guessed: {
		fill: '--map-country-guessed',
		outline: '--map-country-guessed-outline',
		opacity: '--map-country-guessed-opacity',
		weight: '--map-country-guessed-weight'
	},
	wrong: {
		fill: '--map-country-wrong',
		outline: '--map-country-wrong-outline',
		opacity: '--map-country-wrong-opacity',
		weight: '--map-country-wrong-weight'
	}
}

/** Mirrors [data-theme='quiz'] tokens — used in tests and SSR. */
export const QUIZ_MAP_THEME_FALLBACK: MapThemeStyles = {
	default: {
		fillColor: '#eceae4',
		fillOpacity: 0.48,
		weight: 0.75,
		color: '#7a838e'
	},
	hover: {
		fillColor: '#ddd6fe',
		fillOpacity: 0.58,
		weight: 1,
		color: '#a99be8'
	},
	selected: {
		fillColor: '#c4b5fd',
		fillOpacity: 0.86,
		weight: 2.25,
		color: '#6d5cc0'
	},
	guessed: {
		fillColor: '#58b67d',
		fillOpacity: 0.8,
		weight: 0.65,
		color: '#2d7a4a'
	},
	wrong: {
		fillColor: '#e06b5c',
		fillOpacity: 0.92,
		weight: 1.55,
		color: '#b83a2f'
	}
}

export const QUIZ_BASEMAP_COLORS_FALLBACK: MapBasemapColors = {
	water: '#b8daf0',
	waterway: '#7eb8dd',
	waterwayOpacity: 0.9
}

function readCssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
	const value = styles.getPropertyValue(name).trim()
	return value || fallback
}

function readCssNumber(styles: CSSStyleDeclaration, name: string, fallback: number): number {
	const raw = styles.getPropertyValue(name).trim()
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

function readStateStyle(
	styles: CSSStyleDeclaration,
	state: EntityVisualState,
	fallback: PolygonStyle
): PolygonStyle {
	const vars = MAP_STATE_VARS[state]
	return {
		fillColor: readCssVar(styles, vars.fill, fallback.fillColor),
		color: readCssVar(styles, vars.outline, fallback.color),
		fillOpacity: readCssNumber(styles, vars.opacity, fallback.fillOpacity),
		weight: readCssNumber(styles, vars.weight, fallback.weight)
	}
}

export function readMapTheme(root?: HTMLElement | null): MapThemeStyles {
	if (typeof document === 'undefined') return QUIZ_MAP_THEME_FALLBACK

	const el = root ?? document.documentElement
	const computed = getComputedStyle(el)
	const fallback = QUIZ_MAP_THEME_FALLBACK

	return {
		default: readStateStyle(computed, 'default', fallback.default),
		hover: readStateStyle(computed, 'hover', fallback.hover),
		selected: readStateStyle(computed, 'selected', fallback.selected),
		guessed: readStateStyle(computed, 'guessed', fallback.guessed),
		wrong: readStateStyle(computed, 'wrong', fallback.wrong)
	}
}

export function readMapBasemapColors(root?: HTMLElement | null): MapBasemapColors {
	if (typeof document === 'undefined') return QUIZ_BASEMAP_COLORS_FALLBACK

	const computed = getComputedStyle(root ?? document.documentElement)
	const fallback = QUIZ_BASEMAP_COLORS_FALLBACK

	return {
		water: readCssVar(computed, '--map-water', fallback.water),
		waterway: readCssVar(computed, '--map-waterway', fallback.waterway),
		waterwayOpacity: readCssNumber(computed, '--map-waterway-opacity', fallback.waterwayOpacity)
	}
}
