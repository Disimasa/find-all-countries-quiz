import type { EraRegistration } from '@domain/maps'
import type { MessageKey } from '@i18n'

export function formatPlayEraLabel(
	eraId: string,
	registration: EraRegistration | undefined,
	translate: (key: MessageKey) => string
): string {
	if (!registration) return eraId
	if (registration.year !== null) {
		return translate('eraYearAd').replace('{year}', String(registration.year))
	}
	return translate(registration.labelKey)
}
