const ENTITY_FLAG_OVERRIDES: Record<string, string> = {
	SYN_NORTHERN_CYPRUS: 'CY',
	SYN_SOMALILAND: 'SO'
}

export function resolveFlagCode(entityId: string, flagCode?: string): string | null {
	if (flagCode && /^[A-Z]{2}$/.test(flagCode)) return flagCode
	if (ENTITY_FLAG_OVERRIDES[entityId]) return ENTITY_FLAG_OVERRIDES[entityId]
	if (/^[A-Z]{2}$/.test(entityId)) return entityId
	return null
}

export function getFlagEmoji(entityId: string, flagCode?: string): string {
	const code = resolveFlagCode(entityId, flagCode)
	if (!code) return '🏳️'
	return String.fromCodePoint(
		...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0))
	)
}
