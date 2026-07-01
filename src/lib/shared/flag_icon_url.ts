import { resolveFlagCode } from './flag_emoji.ts'

const flagIconUrls = import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', {
	query: '?url',
	import: 'default',
	eager: true
}) as Record<string, string>

export function getFlagIconUrl(entityId: string, flagCode?: string): string | null {
	const code = resolveFlagCode(entityId, flagCode)
	if (!code) return null
	return flagIconUrls[`/node_modules/country-flag-icons/3x2/${code}.svg`] ?? null
}
