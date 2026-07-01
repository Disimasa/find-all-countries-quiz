import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataDir = path.join(root, 'static/data/eras/modern')

describe('modern entities dataset', () => {
	const entities = JSON.parse(fs.readFileSync(path.join(dataDir, 'entities.json'), 'utf8')) as {
		id: string
	}[]
	const geo = JSON.parse(fs.readFileSync(path.join(dataDir, 'boundaries.geojson'), 'utf8')) as {
		features: { properties?: { ISO_A2?: string } }[]
	}

	const entityIds = new Set(entities.map((entity) => entity.id))
	const geoIds = new Set(
		geo.features
			.map((feature) => feature.properties?.ISO_A2)
			.filter((id): id is string => !!id && id !== '-99')
	)

	it('has the expected curated size for the modern era', () => {
		expect(entities.length).toBe(178)
		expect(geoIds.size).toBe(178)
	})

	it('keeps entities.json in sync with boundaries.geojson', () => {
		const missingInEntities = [...geoIds].filter((id) => !entityIds.has(id)).sort()
		const missingInGeo = [...entityIds].filter((id) => !geoIds.has(id)).sort()

		expect(missingInEntities).toEqual([])
		expect(missingInGeo).toEqual([])
	})
})
