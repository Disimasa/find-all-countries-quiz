export type FlagSource =
	| { kind: 'iso'; code: string }
	| { kind: 'era-asset'; path: string }
	| { kind: 'none' }

export interface FlagResolveInput {
	eraId: string
	entityId: string
	flagCode?: string
	flagAsset?: string
}
