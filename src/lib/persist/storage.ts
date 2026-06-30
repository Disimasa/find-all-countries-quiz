export function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined'
}
