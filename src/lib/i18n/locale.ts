import { writable, derived, get } from 'svelte/store'
import type { Locale } from '@domain/entities'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, messages } from './constants.ts'
import type { MessageKey } from './types.ts'

function detectLocale(): Locale {
	if (typeof window === 'undefined') return DEFAULT_LOCALE
	const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
	if (stored === 'en' || stored === 'ru') return stored
	const lang = navigator.language.toLowerCase()
	return lang.startsWith('ru') ? 'ru' : DEFAULT_LOCALE
}

export const locale = writable<Locale>(detectLocale())

export const t = derived(locale, ($locale) => {
	return (key: MessageKey) => messages[$locale][key] as string
})

export function setLocale(next: Locale): void {
	locale.set(next)
	if (typeof window !== 'undefined') localStorage.setItem(LOCALE_STORAGE_KEY, next)
}

export function getLocale(): Locale {
	return get(locale)
}
