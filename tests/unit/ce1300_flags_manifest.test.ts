import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const flagsDir = path.join(root, 'static/flags/eras/ce1300')
const curatedPath = path.join(root, 'scripts/era-mappings/ce1300_flag_curated.json')
const entitiesPath = path.join(root, 'static/data/eras/ce1300/entities.json')

describe('ce1300 era flags manifest', () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(flagsDir, 'manifest.json'), 'utf8')
	) as { entityId: string; file: string }[]
	const coverage = JSON.parse(
		fs.readFileSync(path.join(flagsDir, 'coverage.json'), 'utf8')
	) as { total: number; fetched: number }
	const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8')) as Record<string, string>
	const entities = JSON.parse(fs.readFileSync(entitiesPath, 'utf8')) as {
		id: string
		flagAsset?: string
	}[]

	it('curates a flag source for every entity', () => {
		for (const entity of entities) {
			expect(curated[entity.id], entity.id).toMatch(/^(commons:|timemap:|iso:)/)
		}
	})

	it('materializes every curated flag source', () => {
		for (const entityId of Object.keys(curated)) {
			expect(manifest.some((entry) => entry.entityId === entityId), entityId).toBe(true)
		}
	})

	it('writes flag files for manifest entries', () => {
		for (const entry of manifest) {
			expect(fs.existsSync(path.join(flagsDir, entry.file))).toBe(true)
		}
	})

	it('has full flag coverage', () => {
		expect(coverage.fetched).toBe(coverage.total)
		expect(coverage.fetched).toBe(entities.length)
	})

	it('uses flagAsset for non-svg entities', () => {
		expect(entities.find((e) => e.id === 'champa')?.flagAsset).toBe('champa.jpg')
		expect(entities.find((e) => e.id === 'great-khanate')?.flagAsset).toBe('great-khanate.png')
	})

	it('stores well-formed svg flag files', () => {
		for (const entry of manifest) {
			if (!entry.file.endsWith('.svg')) continue
			const text = fs.readFileSync(path.join(flagsDir, entry.file), 'utf8')
			expect(text.includes('<svg'), entry.entityId).toBe(true)
			expect(/<\/svg>\s*$/i.test(text.trim()), entry.entityId).toBe(true)
		}
	})
})
