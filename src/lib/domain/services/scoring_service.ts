export class ScoringService {
	normalize(value: string): string {
		return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
	}

	matchesAlias(input: string, aliases: string[]): boolean {
		const normalized = this.normalize(input)
		return aliases.some((alias) => this.normalize(alias) === normalized)
	}

	resolveEntityId(input: string, aliasesById: Map<string, string[]>): string | null {
		const normalized = this.normalize(input)
		for (const [id, aliases] of aliasesById) {
			if (aliases.some((alias) => this.normalize(alias) === normalized)) {
				return id
			}
		}
		return null
	}
}
