import type { FeatureCollection } from 'geojson'

const cache = new Map<string, unknown>()

export class GeoJsonLoader {
	async load(path: string): Promise<FeatureCollection> {
		return this.loadJson<FeatureCollection>(path)
	}

	async loadJson<T>(path: string): Promise<T> {
		if (cache.has(path)) return cache.get(path) as T
		const response = await fetch(path)
		if (!response.ok) throw new Error(`Failed to load ${path}`)
		const data = (await response.json()) as T
		cache.set(path, data)
		return data
	}

	static clearCache(): void {
		cache.clear()
	}
}
