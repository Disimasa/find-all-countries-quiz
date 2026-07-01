/** Lobby background teaser — highlight a random country on this interval. */
export const LOBBY_TEASER_INTERVAL_MS = 5200
/** Skip countries whose bbox span is below this (degrees) at world zoom. */
export const LOBBY_TEASER_MIN_BBOX_SPAN = 1.4
/** Pin + bubble clip at the top of the lobby map — skip northern centroids above this lat. */
export const LOBBY_TEASER_MAX_CENTROID_LAT = 62
/** Always skip these ISO codes in the lobby teaser (off-screen or awkward placement). */
export const LOBBY_TEASER_EXCLUDED_COUNTRY_IDS = ['GL', 'JP'] as const

export const LOBBY_PIN_MODES = ['question', 'thinking', 'dots', 'typing'] as const
export const LOBBY_PIN_START_MODE = 'start' as const
