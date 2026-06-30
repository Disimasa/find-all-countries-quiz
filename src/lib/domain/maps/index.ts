import type { BaseMapEra } from './base.ts'
import { MODERN_ERA_ID } from './modern/constants.ts'
import { ModernWorldMap } from './modern/map.ts'

const eras = new Map<string, () => BaseMapEra>()

export class MapEraRegistry {
	static register(id: string, factory: () => BaseMapEra): void {
		eras.set(id, factory)
	}

	static create(id: string): BaseMapEra {
		const factory = eras.get(id)
		if (!factory) throw new Error(`Unknown map era: ${id}`)
		return factory()
	}

	static list(): string[] {
		return [...eras.keys()]
	}
}

MapEraRegistry.register(MODERN_ERA_ID, () => new ModernWorldMap())

export { MODERN_ERA_ID } from './modern/constants.ts'
export { BaseMapEra } from './base.ts'
export { ModernWorldMap } from './modern/map.ts'
