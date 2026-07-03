import type { MapEraDescriptor } from '@domain/entities'
import type { BaseMapEra } from './base.ts'
import {
	DEFAULT_ERA_ID,
	getEraRegistration,
	listEraRegistrations,
	registerEra,
	resolveThemeProfileId,
	type EraRegistration
} from './registry.ts'

export class MapEraRegistry {
	static register(meta: EraRegistration): void {
		registerEra(meta)
	}

	static create(id: string): BaseMapEra {
		const registration = getEraRegistration(id)
		if (!registration) throw new Error(`Unknown map era: ${id}`)
		return registration.factory()
	}

	static listIds(): string[] {
		return listEraRegistrations().map((era) => era.id)
	}

	/** @deprecated Use listIds() */
	static list(): string[] {
		return MapEraRegistry.listIds()
	}

	static listDescriptors(): MapEraDescriptor[] {
		return listEraRegistrations().map((registration) => ({
			id: registration.id,
			year: registration.year,
			entityType: registration.entityType
		}))
	}

	static isKnown(id: string): boolean {
		return getEraRegistration(id) !== undefined
	}

	static getRegistration(id: string): EraRegistration | undefined {
		return getEraRegistration(id)
	}

	static resolveThemeProfileId(eraId: string): string {
		return resolveThemeProfileId(eraId)
	}
}

export {
	DEFAULT_ERA_ID,
	registerEra,
	resolveThemeProfileId,
	type EraRegistration
} from './registry.ts'
export { MODERN_ERA_ID } from './modern/constants.ts'
export { PREWW1_ERA_ID } from './preww1/constants.ts'
export { CE100_ERA_ID } from './ce100/constants.ts'
export { BaseMapEra } from './base.ts'
export { ModernWorldMap } from './modern/map.ts'
export { PreWW1WorldMap } from './preww1/map.ts'
export { Ce100WorldMap } from './ce100/map.ts'
