import type { BaseGameMode } from './base.ts'
import { IDENTIFY_BY_NAME_MODE_ID } from './identify_by_name/constants.ts'
import { IdentifyByNameMode } from './identify_by_name/mode.ts'

const modes = new Map<string, () => BaseGameMode>()

export class GameModeRegistry {
	static register(id: string, factory: () => BaseGameMode): void {
		modes.set(id, factory)
	}

	static create(id: string): BaseGameMode {
		const factory = modes.get(id)
		if (!factory) throw new Error(`Unknown game mode: ${id}`)
		return factory()
	}
}

GameModeRegistry.register(IDENTIFY_BY_NAME_MODE_ID, () => new IdentifyByNameMode())

export { BaseGameMode } from './base.ts'
export { IDENTIFY_BY_NAME_MODE_ID } from './identify_by_name/constants.ts'
export { IdentifyByNameMode } from './identify_by_name/mode.ts'
