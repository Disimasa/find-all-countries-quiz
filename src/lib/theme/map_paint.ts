import type { ExpressionSpecification } from 'maplibre-gl'
import type { MapThemeStyles } from './map_theme.ts'

export function buildCountryPaint(theme: MapThemeStyles) {
	return {
		fillColor: buildFillColor(theme),
		fillOpacity: buildFillOpacity(theme),
		fillOutlineColor: buildFillOutlineColor(theme)
	}
}

export function buildCountryBorderPaint(theme: MapThemeStyles) {
	return {
		lineColor: buildFillOutlineColor(theme),
		lineWidth: buildAccentLineWidth(theme),
		lineOpacity: buildAccentLineOpacity(theme)
	}
}

function buildFillColor(theme: MapThemeStyles): ExpressionSpecification {
	return [
		'match',
		['feature-state', 'visual'],
		'guessed',
		theme.guessed.fillColor,
		'wrong',
		theme.wrong.fillColor,
		'selected',
		theme.selected.fillColor,
		'hover',
		theme.hover.fillColor,
		theme.default.fillColor
	]
}

function buildFillOpacity(theme: MapThemeStyles): ExpressionSpecification {
	return [
		'match',
		['feature-state', 'visual'],
		'guessed',
		theme.guessed.fillOpacity,
		'wrong',
		theme.wrong.fillOpacity,
		'selected',
		theme.selected.fillOpacity,
		'hover',
		theme.hover.fillOpacity,
		theme.default.fillOpacity
	]
}

function buildFillOutlineColor(theme: MapThemeStyles): ExpressionSpecification {
	return [
		'match',
		['feature-state', 'visual'],
		'guessed',
		theme.guessed.color,
		'wrong',
		theme.wrong.color,
		'selected',
		theme.selected.color,
		'hover',
		theme.hover.color,
		theme.default.color
	]
}

/** Extra line layer for selected/wrong — fill-outline width is fixed in MapLibre. */
function buildAccentLineWidth(theme: MapThemeStyles): ExpressionSpecification {
	return [
		'match',
		['feature-state', 'visual'],
		'wrong',
		theme.wrong.weight,
		'selected',
		theme.selected.weight,
		0
	]
}

function buildAccentLineOpacity(theme: MapThemeStyles): ExpressionSpecification {
	return [
		'match',
		['feature-state', 'visual'],
		'wrong',
		0.95,
		'selected',
		1,
		0
	]
}
