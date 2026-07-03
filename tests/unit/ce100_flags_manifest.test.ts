import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const flagsDir = path.join(root, 'static/flags/eras/ce100')
const curatedPath = path.join(root, 'scripts/era-mappings/ce100_flag_curated.json')

describe('ce100 era flags manifest', () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(flagsDir, 'manifest.json'), 'utf8')
	) as { entityId: string; file: string }[]
	const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8')) as Record<string, string>

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
})
