import type { GeoEntity, Locale } from '@domain/entities'

export function sortEntitiesAlphabetically(entities: GeoEntity[], locale: Locale): GeoEntity[] {
	return [...entities].sort((a, b) =>
		a.names[locale].localeCompare(b.names[locale], locale, { sensitivity: 'base' })
	)
}
