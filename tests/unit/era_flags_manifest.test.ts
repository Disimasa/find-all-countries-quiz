import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const flagsDir = path.join(root, 'static/flags/eras/preww1')
const curatedPath = path.join(root, 'scripts/era-mappings/preww1_flag_curated.json')
const entitiesPath = path.join(root, 'static/data/eras/preww1/entities.json')

describe('preww1 era flags manifest', () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(flagsDir, 'manifest.json'), 'utf8')
	) as { entityId: string; file: string }[]
	const coverage = JSON.parse(
		fs.readFileSync(path.join(flagsDir, 'coverage.json'), 'utf8')
	) as { total: number; fetched: number }
	const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8')) as Record<string, string>
	const entities = JSON.parse(fs.readFileSync(entitiesPath, 'utf8')) as { id: string }[]

	it('curates a flag source for every entity', () => {
		for (const entity of entities) {
			expect(curated[entity.id], entity.id).toMatch(/^(commons:|iso:)/)
		}
	})

	it('writes svg files for manifest entries', () => {
		for (const entry of manifest) {
			expect(fs.existsSync(path.join(flagsDir, entry.file))).toBe(true)
		}
	})

	it('has near-complete flag coverage', () => {
		expect(coverage.fetched).toBe(coverage.total)
		expect(coverage.fetched / coverage.total).toBeGreaterThanOrEqual(0.95)
	})
})