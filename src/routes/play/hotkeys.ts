export const RANDOM_COUNTRY_HOTKEY = 'F2'

export function isRandomCountryHotkey(event: KeyboardEvent): boolean {
	return event.code === 'F2' && event.ctrlKey !== true && event.metaKey !== true && event.altKey !== true
}
