import { get, writable } from 'svelte/store'
import { locale, setLocale, type MessageKey } from '@i18n'
import type { Locale } from '@domain/entities'

export const timerEnabled = writable(true)
export const livesEnabled = writable(true)

export function toggleLocale(): void {
	const next: Locale = get(locale) === 'en' ? 'ru' : 'en'
	setLocale(next)
}

export function buildPlayHref(): string {
	const params = new URLSearchParams()
	if (!get(timerEnabled)) params.set('timer', '0')
	if (!get(livesEnabled)) params.set('lives', '0')
	const query = params.toString()
	return query ? `/play?${query}` : '/play'
}

export type { MessageKey }
