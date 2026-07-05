/**
 * Download OpenHistoricalMap boundary snapshot for a given year.
 *
 * Source: planet.openhistoricalmap.org S3 → planet-stats/boundary/
 * Format decoder: https://github.com/danvk/ohm (boundary viewer)
 *
 * Usage:
 *   node scripts/fetch_ohm_snapshot.mjs --year=1279
 *   node scripts/fetch_ohm_snapshot.mjs --year=1279 --admin-levels=1,2 --out=scripts/.cache/ohm/snapshots/1279
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeRelation, computeEffectiveDates, isRelationActiveAt } from './lib/ohm/decoder.mjs'
import { relationToFeature, featureCentroid } from './lib/ohm/geometry.mjs'
import { yearToDecimal } from './lib/ohm/date.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const defaultCache = path.join(root, 'scripts/.cache/ohm')

const S3_BASE = 'https://s3.amazonaws.com/planet.openhistoricalmap.org'
const BOUNDARY_PREFIX = 'planet-stats/boundary'
const PLANET_STATE_URL = `${S3_BASE}/planet/state.txt`

const args = Object.fromEntries(
	process.argv.slice(2).map((arg) => {
		const [key, value] = arg.replace(/^--/, '').split('=')
		return [key, value ?? true]
	})
)

const year = Number(args.year ?? 1279)
const adminLevels = String(args['admin-levels'] ?? '1,2')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean)
const outDir =
	args.out ?? path.join(defaultCache, 'snapshots', String(year))
const skipPolygons = args['skip-polygons'] === true || args['skip-polygons'] === 'true'

async function fetchPlanetState() {
	const res = await fetch(PLANET_STATE_URL, {
		headers: { 'User-Agent': 'find-all-countries-quiz/1.0' }
	})
	if (!res.ok) throw new Error(`Failed to read planet state: ${res.status}`)
	const text = (await res.text()).trim()
	const match = text.match(/planet\/(planet-[\w_]+\.osm\.pbf)/)
	return { stateText: text, planetKey: match?.[1] ?? null }
}

async function downloadJson(key, cacheFile) {
	fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
	if (fs.existsSync(cacheFile)) {
		return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
	}
	const url = `${S3_BASE}/${key}`
	console.log(`  download ${key}`)
	const res = await fetch(url, { headers: { 'User-Agent': 'find-all-countries-quiz/1.0' } })
	if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
	const data = JSON.parse(await res.text())
	fs.writeFileSync(cacheFile, JSON.stringify(data))
	return data
}

async function loadAdminLevel(level, rawCacheDir) {
	const relFile = await downloadJson(
		`${BOUNDARY_PREFIX}/relations${level}.b64.json`,
		path.join(rawCacheDir, `relations${level}.b64.json`)
	)
	const ways = await downloadJson(
		`${BOUNDARY_PREFIX}/ways${level}.json`,
		path.join(rawCacheDir, `ways${level}.json`)
	)
	const nodes = await downloadJson(
		`${BOUNDARY_PREFIX}/nodes${level}.json`,
		path.join(rawCacheDir, `nodes${level}.json`)
	)
	const relations = relFile.relations.map((r) => decodeRelation(r, relFile))
	return { level, relations, ways, nodes }
}

function pickDisplayName(tags) {
	return (
		tags['name:en'] ??
		tags.name ??
		tags['official_name:en'] ??
		tags.official_name ??
		tags['short_name:en'] ??
		tags.short_name ??
		'Unknown'
	)
}

function entityRecord(relation, feature, level, year) {
	const tags = relation.tags
	return {
		ohmRelationId: relation.id,
		adminLevel: tags.admin_level ?? level,
		nameEn: pickDisplayName(tags),
		nameRu: tags['name:ru'] ?? null,
		startDate: tags.start_date ?? null,
		endDate: tags.end_date ?? null,
		wikidata: tags.wikidata ?? null,
		wikipedia: tags.wikipedia ?? null,
		centroid: feature ? featureCentroid(feature) : null,
		provenance: {
			dataset: 'openhistoricalmap',
			datasetUrl: 'https://www.openhistoricalmap.org/',
			planetBucket: 'planet.openhistoricalmap.org',
			boundaryLayer: `planet-stats/boundary/relations${level}.b64.json`,
			snapshotYear: year
		}
	}
}

async function main() {
	if (!Number.isFinite(year)) throw new Error('--year must be a number')

	console.log(`OHM snapshot for year ${year}, admin levels: ${adminLevels.join(', ')}`)

	const planet = await fetchPlanetState()
	console.log(`Planet dump: ${planet.planetKey ?? planet.stateText}`)

	const rawCacheDir = path.join(defaultCache, 'raw', planet.planetKey ?? 'latest')
	const yearDec = yearToDecimal(year)

	const allRelations = []
	const ways = {}
	const nodes = {}

	for (const level of adminLevels) {
		console.log(`\nLevel ${level}:`)
		const data = await loadAdminLevel(level, rawCacheDir)
		allRelations.push(...data.relations)
		Object.assign(ways, data.ways)
		Object.assign(nodes, data.nodes)
		console.log(`  ${data.relations.length} relations, ${Object.keys(data.ways).length} ways`)
	}

	computeEffectiveDates(allRelations)

	const active = allRelations.filter((r) => isRelationActiveAt(r, yearDec))
	console.log(`\nActive at ${year}: ${active.length} / ${allRelations.length}`)

	const features = []
	const entities = []
	const errors = []

	for (const relation of active) {
		if (relation.tags.boundary !== 'administrative' && !relation.tags.admin_level) continue
		try {
			const feature = relationToFeature(relation, ways, nodes)
			if (!feature) continue
			if (feature.properties._relation_node) continue
			if (skipPolygons && feature.geometry.type !== 'MultiPolygon') continue

			feature.properties = {
				...feature.properties,
				ohm_relation_id: relation.id,
				ohm_admin_level: relation.tags.admin_level,
				data_source: 'openhistoricalmap',
				source_year: year,
				provenance_dataset: 'planet-stats/boundary'
			}
			features.push(feature)
			entities.push(entityRecord(relation, feature, relation.tags.admin_level, year))
		} catch (err) {
			errors.push({ id: relation.id, name: pickDisplayName(relation.tags), error: String(err.message) })
		}
	}

	entities.sort((a, b) => a.nameEn.localeCompare(b.nameEn))

	const collection = { type: 'FeatureCollection', features }
	const manifest = {
		year,
		yearDecimal: yearDec,
		adminLevels,
		planetKey: planet.planetKey,
		planetStateUrl: PLANET_STATE_URL,
		s3Base: S3_BASE,
		boundaryPrefix: BOUNDARY_PREFIX,
		downloadedAt: new Date().toISOString(),
		source: 'openhistoricalmap',
		sourceUrl: 'https://www.openhistoricalmap.org/',
		license: 'ODbL-1.0',
		licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
		decoderCredit: 'https://github.com/danvk/ohm',
		entityCount: entities.length,
		featureCount: features.length,
		decodeErrors: errors.length
	}

	fs.mkdirSync(outDir, { recursive: true })
	fs.writeFileSync(path.join(outDir, 'snapshot.geojson'), JSON.stringify(collection))
	fs.writeFileSync(path.join(outDir, 'entities.json'), JSON.stringify(entities, null, 2))
	fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
	if (errors.length) {
		fs.writeFileSync(path.join(outDir, 'decode-errors.json'), JSON.stringify(errors, null, 2))
	}

	console.log(`\nWrote ${features.length} features → ${outDir}`)
	if (errors.length) console.warn(`  ${errors.length} decode errors (see decode-errors.json)`)

	// Rus sample
	const rus = entities.filter((e) => {
		const [lon, lat] = e.centroid ?? []
		if (lon == null) return false
		return lat >= 45 && lat <= 62 && lon >= 22 && lon <= 50
	})
	console.log(`\nRus bbox (${rus.length}):`)
	for (const e of rus.slice(0, 25)) {
		console.log(`  - ${e.nameEn}${e.nameRu ? ` / ${e.nameRu}` : ''} [${e.startDate ?? '?'}..${e.endDate ?? '?'}]`)
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
