/** OpenFreeMap Positron — vector basemap; label layers hidden at runtime. */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

export const MAP_ATTRIBUTION = '© OpenFreeMap © OpenStreetMap'

/** MapLibre uses [lng, lat]. */
export const MAP_DEFAULT_CENTER: [number, number] = [0, 20]
export const MAP_DEFAULT_ZOOM = 1
export const MAP_MIN_ZOOM = 1
export const MAP_MAX_ZOOM = 8

/** [west, south, east, north] — initial view similar to Elsewhere Challenge. */
export const MAP_WORLD_BOUNDS: [number, number, number, number] = [-165, -48, 165, 72]
export const MAP_FIT_PADDING = 40
export const MAP_DEFAULT_MAX_FIT_ZOOM = 1.65
export const MAP_WIDE_FIT_PADDING = 220
export const MAP_WIDE_MAX_ZOOM = 0.35
export const MAP_TRANSITION_OUT_MS = 1100
export const MAP_TRANSITION_IN_MS = 1250
/** 0–1: when zoom-in reaches this progress, route UI starts appearing. */
export const MAP_TRANSITION_UI_REVEAL_AT = 0.25

/** Default MapLibre wheel rate is 1/450 — higher value zooms faster. */
export const MAP_WHEEL_ZOOM_RATE = 1 / 180
export const MAP_TRACKPAD_ZOOM_RATE = 1 / 40

export const COUNTRIES_SOURCE_ID = 'countries'
export const COUNTRIES_FILL_LAYER_ID = 'countries-fill'
export const COUNTRIES_LINE_LAYER_ID = 'countries-line'
export const COUNTRY_ID_PROPERTY = 'ISO_A2'

/** Basemap admin borders use a different dataset than quiz GeoJSON — keep hidden. */
export const HIDDEN_BOUNDARY_LAYER_IDS = ['boundary_2', 'boundary_3', 'boundary_disputed'] as const

export const MAP_WATER_LAYER_ID = 'water'
export const MAP_WATERWAY_LAYER_ID = 'waterway'
