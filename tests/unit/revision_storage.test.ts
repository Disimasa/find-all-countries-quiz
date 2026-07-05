import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	formatRevisionTimestamp,
	latestRevisionId,
	listRevisionIds,
	saveRevision
} from '$lib/dev/boundary_editor/revision_storage'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('revision_storage', () => {
	it('formats timestamps for filenames', () => {
		expect(formatRevisionTimestamp(new Date('2026-07-04T20:30:00.000Z'))).toBe(
			'2026-07-04T20-30-00Z'
		)
	})

	it('writes and lists revision files', () => {
		const eraId = '__test_revision_era'
		const eraDir = path.join(root, 'static/data/eras', eraId)
		fs.rmSync(eraDir, { recursive: true, force: true })

		const savedAt = new Date('2026-07-04T20:30:00.000Z')
		const { revisionId, relativePath } = saveRevision(
			root,
			eraId,
			{
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: { entity_id: 'sample' },
						geometry: {
							type: 'Polygon',
							coordinates: [
								[
									[30, 50],
									[31, 50],
									[31, 51],
									[30, 51],
									[30, 50]
								]
							]
						}
					}
				]
			},
			savedAt
		)

		expect(revisionId).toBe('2026-07-04T20-30-00Z')
		expect(relativePath).toBe(`static/data/eras/${eraId}/revisions/${revisionId}.geojson`)
		expect(listRevisionIds(root, eraId)).toEqual([revisionId])
		expect(latestRevisionId(root, eraId)).toBe(revisionId)

		const saved = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')) as {
			features: { properties: { revision_saved_at: string } }[]
		}
		expect(saved.features[0].properties.revision_saved_at).toBe(savedAt.toISOString())

		fs.rmSync(eraDir, { recursive: true, force: true })
	})
})
