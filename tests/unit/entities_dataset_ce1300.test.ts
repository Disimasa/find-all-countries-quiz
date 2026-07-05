import fs from 'node:fs'

import path from 'node:path'

import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'



const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const dataDir = path.join(root, 'static/data/eras/ce1300')



const CYRILLIC = /[А-Яа-яЁё]/

const LATIN_ONLY = /^[A-Za-z0-9 ,.'()\-/&]+$/



describe('ce1300 entities dataset', () => {

	const entities = JSON.parse(fs.readFileSync(path.join(dataDir, 'entities.json'), 'utf8')) as {

		id: string

		nameEn: string

		nameRu: string

	}[]

	const aliasesRu = JSON.parse(fs.readFileSync(path.join(dataDir, 'aliases.ru.json'), 'utf8')) as Record<

		string,

		string[]

	>

	const geo = JSON.parse(fs.readFileSync(path.join(dataDir, 'boundaries.geojson'), 'utf8')) as {

		features: { properties?: { entity_id?: string; source?: string } }[]

	}

	const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf8')) as {

		entityCount: number

		snapshotYear: number

		source: string

		cliopatriaAddCount: number

	}



	const entityIds = new Set(entities.map((entity) => entity.id))

	const geoIds = new Set(

		geo.features

			.map((feature) => feature.properties?.entity_id)

			.filter((id): id is string => !!id)

	)



	it('has the expected hybrid size for ce1300', () => {

		expect(meta.entityCount).toBe(entities.length)

		expect(meta.snapshotYear).toBe(1300)

		expect(meta.source).toBe('hybrid:historical-basemaps+cliopatria')

		expect(meta.cliopatriaAddCount).toBe(11)

		expect(entities.length).toBe(72)

	})



	it('keeps entities.json in sync with boundaries.geojson', () => {

		const missingInEntities = [...geoIds].filter((id) => !entityIds.has(id)).sort()

		const missingInGeo = [...entityIds].filter((id) => !geoIds.has(id)).sort()



		expect(missingInEntities).toEqual([])

		expect(missingInGeo).toEqual([])

	})



	it('includes major Mongol uluses and Rus principalities from Cliopatria', () => {

		const ids = entities.map((entity) => entity.id)

		expect(ids).toContain('great-khanate')

		expect(ids).toContain('golden-horde')

		expect(ids).toContain('moscow')

		expect(ids).toContain('tver')

		expect(ids).toContain('pskov')

		expect(ids).toContain('galicia-volhynia')

		expect(ids).toContain('chernigov')
		expect(ids).toContain('polotsk')
		expect(ids).toContain('ryazan')

	})



	it('includes Cliopatria supplements outside Rus', () => {

		const ids = entities.map((entity) => entity.id)

		expect(ids).toContain('bosnia')

		expect(ids).toContain('majapahit')

		expect(ids).toContain('genoa')

		expect(ids).toContain('florence')

		expect(ids).toContain('swiss-confederation')

	})



	it('clips Golden Horde by Rus polities', () => {

		const horde = geo.features.find((f) => f.properties?.entity_id === 'golden-horde')

		expect(horde?.properties?.clipped_by).toContain('moscow')

		expect(horde?.properties?.clipped_by).toContain('tver')

	})



	it('uses compact Cliopatria geometry for Ryazan instead of basemaps placeholder', async () => {

		const { area } = await import('@turf/turf')

		const ryazan = geo.features.find((f) => f.properties?.entity_id === 'ryazan')

		expect(ryazan?.properties?.source).toBe('cliopatria')

		expect(ryazan?.properties?.cliopatria_period).toBe('1099-1226')

		expect(area(ryazan)).toBeLessThan(200_000 * 1e6)

		expect(area(ryazan)).toBeGreaterThan(20_000 * 1e6)

	})



	it('avoids area overlap between Cliopatria Rus and basemap parents', async () => {

		const { intersect, area, featureCollection } = await import('@turf/turf')

		const byId = Object.fromEntries(

			geo.features.map((f) => [f.properties?.entity_id, f])

		)

		const parentChildPairs = [

			['novgorod', 'pskov'],

			['novgorod', 'tver'],

			['moscow', 'vladimir-suzdal'],

			['lithuania', 'galicia-volhynia']

		]

		for (const [parentId, childId] of parentChildPairs) {

			const parent = byId[parentId]

			const child = byId[childId]

			expect(parent, parentId).toBeTruthy()

			expect(child, childId).toBeTruthy()

			const overlap = intersect(featureCollection([parent, child]))

			const overlapArea = overlap ? area(overlap) : 0

			expect(overlapArea, `${parentId} x ${childId}`).toBeLessThan(1_000)

		}

	})



	it('provides Russian names for every entity', () => {

		const untranslated = entities.filter((entity) => entity.nameRu === entity.nameEn)

		expect(untranslated.map((entity) => entity.id)).toEqual([])

		for (const entity of entities) {

			expect(entity.nameRu, entity.id).toMatch(CYRILLIC)

		}

	})



	it('keeps aliases.ru.json Russian-only', () => {

		for (const entity of entities) {

			const aliases = aliasesRu[entity.id]

			expect(aliases, entity.id).toBeTruthy()

			expect(aliases[0]).toBe(entity.nameRu)

			for (const alias of aliases) {

				expect(alias, `${entity.id}: ${alias}`).toMatch(CYRILLIC)

				expect(LATIN_ONLY.test(alias), `${entity.id}: ${alias}`).toBe(false)

			}

		}

	})



	it('does not accept modern country names as cheat aliases', () => {
		const aliasesEn = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'aliases.en.json'), 'utf8')
		) as Record<string, string[]>
		const normalize = (value: string) => value.trim().toLowerCase()

		const bannedEn: Record<string, string[]> = {
			ilkhanate: ['persia'],
			'holy-roman-empire': ['germany'],
			'mamluk-sultanate': ['egypt'],
			'kamakura-japan': ['japan'],
			'khmer-empire': ['cambodia'],
			'hindu-kingdoms': ['india'],
			'sinhalese-kingdom': ['sri lanka', 'ceylon'],
			'dai-viet': ['vietnam'],
			'papal-states': ['vatican'],
			'hafsid-caliphate': ['tunisia'],
			'great-zimbabwe': ['zimbabwe'],
			'teutonic-knights': ['prussia'],
			england: ['britain'],
			'swiss-confederation': ['switzerland']
		}

		for (const [entityId, banned] of Object.entries(bannedEn)) {
			const aliases = aliasesEn[entityId] ?? []
			for (const cheat of banned) {
				expect(aliases.map(normalize), `${entityId} EN`).not.toContain(cheat)
			}
		}
	})

})

