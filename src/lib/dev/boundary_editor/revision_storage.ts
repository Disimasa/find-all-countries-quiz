import fs from 'node:fs'
import path from 'node:path'
import type { FeatureCollection } from 'geojson'

export function revisionsDir(root: string, eraId: string): string {
	return path.join(root, 'static/data/eras', eraId, 'revisions')
}

/** Filesystem-safe ISO timestamp, e.g. `2026-07-04T20-30-00Z`. */
export function formatRevisionTimestamp(date = new Date()): string {
	return date.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z')
}

export function listRevisionIds(root: string, eraId: string): string[] {
	const dir = revisionsDir(root, eraId)
	if (!fs.existsSync(dir)) return []

	return fs
		.readdirSync(dir)
		.filter((name) => name.endsWith('.geojson'))
		.map((name) => name.replace(/\.geojson$/, ''))
		.sort()
}

export function latestRevisionId(root: string, eraId: string): string | null {
	const revisions = listRevisionIds(root, eraId)
	return revisions.at(-1) ?? null
}

export function saveRevision(
	root: string,
	eraId: string,
	collection: FeatureCollection,
	savedAt = new Date()
): { revisionId: string; relativePath: string } {
	const dir = revisionsDir(root, eraId)
	fs.mkdirSync(dir, { recursive: true })

	const revisionId = formatRevisionTimestamp(savedAt)
	const relativePath = `static/data/eras/${eraId}/revisions/${revisionId}.geojson`
	const filePath = path.join(root, relativePath)

	const output: FeatureCollection = {
		type: 'FeatureCollection',
		features: collection.features.map((feature) => ({
			...feature,
			properties: {
				...feature.properties,
				revision_saved_at: savedAt.toISOString()
			}
		}))
	}

	fs.writeFileSync(filePath, JSON.stringify(output, null, 2))
	return { revisionId, relativePath }
}
