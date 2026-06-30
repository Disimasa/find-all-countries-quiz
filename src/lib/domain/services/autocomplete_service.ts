import type { GeoEntity, Locale } from '@domain/entities'
import { ScoringService } from '@domain/services/scoring_service'

export class AutocompleteService {
	private readonly scoring = new ScoringService()

	filter(
		query: string,
		entities: GeoEntity[],
		locale: Locale,
		guessedIds: ReadonlySet<string>,
		aliases: Map<string, string[]>,
		limit = 10
	): GeoEntity[] {
		const available = entities.filter((e) => !guessedIds.has(e.id))
		if (!query.trim()) return []

		const normalizedQuery = this.scoring.normalize(query)
		return available
			.filter((entity) => {
				const names = aliases.get(entity.id) ?? [entity.names[locale]]
				return names.some((name) => this.scoring.normalize(name).includes(normalizedQuery))
			})
			.slice(0, limit)
	}
}
