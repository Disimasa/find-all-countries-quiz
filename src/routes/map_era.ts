import type { BaseMapEra } from '@domain/maps'

let sharedEra: BaseMapEra | null = null

export function setSharedMapEra(era: BaseMapEra): void {
	sharedEra = era
}

export function getSharedMapEra(): BaseMapEra | null {
	return sharedEra
}
