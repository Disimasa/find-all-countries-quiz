import type { EntityType } from '@domain/entities'
import type { MessageKey } from '@i18n'
import type { BaseMapEra } from './base.ts'
import { MODERN_ERA_ID } from './modern/constants.ts'
import { ModernWorldMap } from './modern/map.ts'
import { PREWW1_ERA_ID } from './preww1/constants.ts'
import { PreWW1WorldMap } from './preww1/map.ts'
import { CE100_ERA_ID } from './ce100/constants.ts'
import { Ce100WorldMap } from './ce100/map.ts'

export interface EraRegistration {
	readonly id: string
	readonly factory: () => BaseMapEra
	readonly year: number | null
	readonly entityType: EntityType
	readonly themeProfileId: string
	readonly labelKey: MessageKey
}

const registrations = new Map<string, EraRegistration>()

export const DEFAULT_ERA_ID = MODERN_ERA_ID

export function registerEra(meta: EraRegistration): void {
	registrations.set(meta.id, meta)
}

export function getEraRegistration(id: string): EraRegistration | undefined {
	return registrations.get(id)
}

export function listEraRegistrations(): EraRegistration[] {
	return [...registrations.values()]
}

export function resolveThemeProfileId(eraId: string): string {
	return registrations.get(eraId)?.themeProfileId ?? 'modern'
}

registerEra({
	id: MODERN_ERA_ID,
	factory: () => new ModernWorldMap(),
	year: null,
	entityType: 'country',
	themeProfileId: 'modern',
	labelKey: 'eraModern'
})

registerEra({
	id: PREWW1_ERA_ID,
	factory: () => new PreWW1WorldMap(),
	year: 1914,
	entityType: 'polity',
	themeProfileId: 'parchment',
	labelKey: 'eraPreWW1'
})

registerEra({
	id: CE100_ERA_ID,
	factory: () => new Ce100WorldMap(),
	year: 100,
	entityType: 'polity',
	themeProfileId: 'parchment',
	labelKey: 'eraCe100'
})
