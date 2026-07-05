export function isLobbyEraSelectionRedundant(
	nextEraId: string,
	storeEraId: string,
	mapEraId: string | undefined
): boolean {
	return nextEraId === storeEraId && mapEraId === nextEraId
}
