import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataDir = path.join(root, 'static/data/eras/preww1')

const CYRILLIC = /[А-Яа-яЁё]/
const LATIN_ONLY = /^[A-Za-z0-9 ,.'()\-/&]+$/

describe('preww1 entities dataset', () => {
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
		features: { properties?: { entity_id?: string } }[]
	}
	const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf8')) as {
		entityCount: number
	}

	const entityIds = new Set(entities.map((entity) => entity.id))
	const geoIds = new Set(
		geo.features
			.map((feature) => feature.properties?.entity_id)
			.filter((id): id is string => !!id)
	)

	it('has the expected curated size for preww1', () => {
		expect(meta.entityCount).toBe(entities.length)
		expect(entities.length).toBeGreaterThan(100)
	})

	it('keeps entities.json in sync with boundaries.geojson', () => {
		const missingInEntities = [...geoIds].filter((id) => !entityIds.has(id)).sort()
		const missingInGeo = [...entityIds].filter((id) => !geoIds.has(id)).sort()

		expect(missingInEntities).toEqual([])
		expect(missingInGeo).toEqual([])
	})

	it('merges metropolitan territories into parent states', () => {
		const mergedIntoParent = [
			'alaska',
			'hawaii',
			'puerto-rico',
			'southern-sakhalin-island',
			'iceland'
		]
		const ids = entities.map((entity) => entity.id)
		for (const id of mergedIntoParent) {
			expect(ids, id).not.toContain(id)
		}
		expect(ids).toContain('united-states')
		expect(ids).toContain('japan')
		expect(ids).toContain('denmark')
	})

	it('excludes polities not sovereign on the 1914 snapshot date', () => {
		const notSovereignIn1914 = [
			'ukraine',
			'belarus-byelorussia',
			'estonia',
			'latvia',
			'lithuania',
			'kazakhstan',
			'georgia',
			'armenia',
			'azerbaijan',
			'moldova',
			'finland',
			'poland'
		]
		const ids = entities.map((entity) => entity.id)
		for (const id of notSovereignIn1914) {
			expect(ids, id).not.toContain(id)
		}
		expect(ids).toContain('russia-soviet-union')
	})

	it('uses era-appropriate English names, not CShapes anachronisms', () => {
		const byId = Object.fromEntries(entities.map((entity) => [entity.id, entity.nameEn]))
		expect(byId['russia-soviet-union']).toBe('Russian Empire')
		expect(byId['germany-prussia']).toBe('German Empire')
		expect(byId['turkey-ottoman-empire']).toBe('Ottoman Empire')
		expect(byId['persia']).toBe('Persia')

		const anachronisms = entities
			.map((entity) => entity.nameEn)
			.filter((name) => /Soviet Union|Ottoman Empire\)|Prussia\)|\(Zaire\)|\(Eswatini\)/.test(name))
		expect(anachronisms).toEqual([])
	})

	it('keeps aliases.en.json aligned with canonical English names', () => {
		const aliasesEn = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'aliases.en.json'), 'utf8')
		) as Record<string, string[]>

		for (const entity of entities) {
			expect(aliasesEn[entity.id]?.[0], entity.id).toBe(entity.nameEn)
		}
	})

	it('does not accept modern country names as cheat aliases for renamed polities', () => {
		const aliasesEn = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'aliases.en.json'), 'utf8')
		) as Record<string, string[]>
		const aliasesRu = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'aliases.ru.json'), 'utf8')
		) as Record<string, string[]>

		const normalize = (value: string) => value.trim().toLowerCase()

		const bannedEn: Record<string, string[]> = {
			persia: ['iran'],
			thailand: ['thailand'],
			'sri-lanka-ceylon': ['sri lanka'],
			'dutch-east-indies': ['indonesia'],
			'british-india': ['india'],
			'vietnam-annam-cochin-china-tonkin': ['vietnam'],
			'zimbabwe-rhodesia': ['zimbabwe'],
			'tanzania-tanganyika': ['tanzania'],
			'swaziland-eswatini': ['eswatini']
		}

		const bannedRu: Record<string, string[]> = {
			persia: ['иран'],
			thailand: ['таиланд'],
			'sri-lanka-ceylon': ['шри-ланка'],
			'dutch-east-indies': ['индонезия'],
			'british-india': ['индия'],
			'vietnam-annam-cochin-china-tonkin': ['вьетнам'],
			'zimbabwe-rhodesia': ['зимбабве'],
			'tanzania-tanganyika': ['танзания'],
			'swaziland-eswatini': ['эсватини']
		}

		for (const [entityId, banned] of Object.entries(bannedEn)) {
			const aliases = aliasesEn[entityId] ?? []
			for (const cheat of banned) {
				expect(aliases.map(normalize), `${entityId} EN`).not.toContain(cheat)
			}
		}

		for (const [entityId, banned] of Object.entries(bannedRu)) {
			const aliases = aliasesRu[entityId] ?? []
			for (const cheat of banned) {
				expect(aliases.map(normalize), `${entityId} RU`).not.toContain(cheat)
			}
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
})
