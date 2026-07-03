import { MODERN_ERA_ID } from '@domain/maps'
import type { FlagResolveInput, FlagSource } from './types.ts'

export function resolveFlagSource(input: FlagResolveInput): FlagSource {
	const { eraId, entityId, flagCode, flagAsset } = input

	if (eraId !== MODERN_ERA_ID) {
		if (flagCode && /^[A-Z]{2}$/.test(flagCode)) {
			return { kind: 'iso', code: flagCode }
		}
		const assetName = flagAsset ?? `${entityId}.svg`
		return { kind: 'era-asset', path: `/flags/eras/${eraId}/${assetName}` }
	}

	if (flagCode && /^[A-Z]{2}$/.test(flagCode)) {
		return { kind: 'iso', code: flagCode }
	}

	if (/^[A-Z]{2}$/.test(entityId)) {
		return { kind: 'iso', code: entityId }
	}

	return { kind: 'none' }
}
