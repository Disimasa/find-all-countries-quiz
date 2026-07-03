import { MODERN_ERA_ID } from '@domain/maps'
import { resolveFlagSource } from './flags/resolver.ts'
import type { FlagResolveInput } from './flags/types.ts'
import { resolveFlagCode } from './flag_emoji.ts'

const flagIconUrls = import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', {
	query: '?url',
	import: 'default',
	eager: true
}) as Record<string, string>

function eraAssetUrl(relativePath: string): string {
	const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
	return normalized
}

export function getFlagIconUrl(
	input: FlagResolveInput | string,
	flagCode?: string
): string | null {
	const resolved: FlagResolveInput =
		typeof input === 'string'
			? { eraId: MODERN_ERA_ID, entityId: input, flagCode }
			: input

	const source = resolveFlagSource(resolved)

	if (source.kind === 'iso') {
		return flagIconUrls[`/node_modules/country-flag-icons/3x2/${source.code}.svg`] ?? null
	}

	if (source.kind === 'era-asset') {
		return eraAssetUrl(source.path)
	}

	if (resolved.eraId === MODERN_ERA_ID) {
		const code = resolveFlagCode(resolved.entityId, resolved.flagCode)
		if (code) {
			return flagIconUrls[`/node_modules/country-flag-icons/3x2/${code}.svg`] ?? null
		}
	}

	return null
}
