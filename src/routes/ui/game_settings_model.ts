import type { Locale } from '@domain/entities'
import { TIMER_MINUTE_PRESETS } from '@domain/session/constants'
import type { GameSettings } from '@persist'

export const SETTINGS_INFINITE_KEY = 'infinite'
export const SETTINGS_LIVES_OPTIONS = [1, 3, 5] as const
export const SETTINGS_TIMER_OPTIONS = TIMER_MINUTE_PRESETS.filter((m) => m !== 10 && m !== 45)
export const SETTINGS_LOCALE_OPTIONS: Locale[] = ['en', 'ru']

export interface SegmentOption {
	key: string
	label: string
	active: boolean
	title?: string
}

export interface TimerSelection {
	enabled: boolean
	minutes?: number
}

export interface LivesSelection {
	enabled: boolean
	count?: number
}

export function parseTimerSelection(key: string): TimerSelection {
	if (key === SETTINGS_INFINITE_KEY) return { enabled: false }
	return { enabled: true, minutes: Number(key) }
}

export function parseLivesSelection(key: string): LivesSelection {
	if (key === SETTINGS_INFINITE_KEY) return { enabled: false }
	return { enabled: true, count: Number(key) }
}

export function applyTimerSelection(
	settings: GameSettings,
	selection: TimerSelection
): GameSettings {
	return {
		...settings,
		timerEnabled: selection.enabled,
		timerMinutes: selection.minutes ?? settings.timerMinutes
	}
}

export function applyLivesSelection(settings: GameSettings, selection: LivesSelection): GameSettings {
	return {
		...settings,
		livesEnabled: selection.enabled,
		maxLives: selection.count ?? settings.maxLives
	}
}

export function buildLocaleSegmentOptions(currentLocale: Locale): SegmentOption[] {
	return SETTINGS_LOCALE_OPTIONS.map((locale) => ({
		key: locale,
		label: locale.toUpperCase(),
		active: currentLocale === locale
	}))
}

export function buildTimerSegmentOptions(
	timerOn: boolean,
	timerMinutes: number,
	infiniteLabel: string
): SegmentOption[] {
	return [
		...SETTINGS_TIMER_OPTIONS.map((minutes) => ({
			key: String(minutes),
			label: String(minutes),
			active: timerOn && timerMinutes === minutes
		})),
		{
			key: SETTINGS_INFINITE_KEY,
			label: '∞',
			active: !timerOn,
			title: infiniteLabel
		}
	]
}

export function buildLivesSegmentOptions(
	livesOn: boolean,
	maxLives: number,
	infiniteLabel: string
): SegmentOption[] {
	return [
		...SETTINGS_LIVES_OPTIONS.map((count) => ({
			key: String(count),
			label: String(count),
			active: livesOn && maxLives === count
		})),
		{
			key: SETTINGS_INFINITE_KEY,
			label: '∞',
			active: !livesOn,
			title: infiniteLabel
		}
	]
}
