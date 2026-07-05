import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataDir = path.join(root, 'static/data/eras/ce100')

const CYRILLIC = /[А-Яа-яЁё]/
const LATIN_ONLY = /^[A-Za-z0-9 ,.'()\-/&]+$/

describe('ce100 entities dataset', () => {
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
		snapshotYear: number
		source: string
	}

	const entityIds = new Set(entities.map((entity) => entity.id))
	const geoIds = new Set(
		geo.features
			.map((feature) => feature.properties?.entity_id)
			.filter((id): id is string => !!id)
	)

	it('has the expected curated size for ce100', () => {
		expect(meta.entityCount).toBe(entities.length)
		expect(meta.snapshotYear).toBe(100)
		expect(meta.source).toBe('historical-basemaps')
		expect(entities.length).toBeGreaterThanOrEqual(30)
		expect(entities.length).toBeLessThanOrEqual(50)
	})

	it('keeps entities.json in sync with boundaries.geojson', () => {
		const missingInEntities = [...geoIds].filter((id) => !entityIds.has(id)).sort()
		const missingInGeo = [...entityIds].filter((id) => !geoIds.has(id)).sort()

		expect(missingInEntities).toEqual([])
		expect(missingInGeo).toEqual([])
	})

	it('includes major ancient polities', () => {
		const ids = entities.map((entity) => entity.id)
		expect(ids).toContain('roman-empire')
		expect(ids).toContain('parthian-empire')
		expect(ids).toContain('han')
		expect(ids).toContain('kushan-empire')
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
		const aliasesRu = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'aliases.ru.json'), 'utf8')
		) as Record<string, string[]>
		const normalize = (value: string) => value.trim().toLowerCase()

		const bannedEn: Record<string, string[]> = {
			'hindu-kingdoms': ['india', 'indian kingdoms'],
			simhala: ['sri lanka', 'ceylon']
		}
		const bannedRu: Record<string, string[]> = {
			han: ['китай'],
			'hindu-kingdoms': ['индия'],
			simhala: ['шри-ланка', 'цейлон']
		}

		for (const [entityId, banned] of Object.entries(bannedEn)) {
			for (const cheat of banned) {
				expect((aliasesEn[entityId] ?? []).map(normalize), `${entityId} EN`).not.toContain(
					cheat
				)
			}
		}

		for (const [entityId, banned] of Object.entries(bannedRu)) {
			for (const cheat of banned) {
				expect((aliasesRu[entityId] ?? []).map(normalize), `${entityId} RU`).not.toContain(
					cheat
				)
			}
		}
	})
})
