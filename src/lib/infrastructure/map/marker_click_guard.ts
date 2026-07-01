export function isClickOnMapMarker(target: EventTarget | null): boolean {
	if (!target || typeof (target as Element).closest !== 'function') return false
	return Boolean((target as Element).closest('.maplibregl-marker'))
}
