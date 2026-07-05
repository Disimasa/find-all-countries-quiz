/**
 * Add manual Chernigov and Polotsk principalities to ce1300.
 * Geometry = unclaimed gap between Golden Horde and Smolensk (and Polotsk pocket NW).
 * Usage: node scripts/add_ce1300_rus_principalities.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { area, centroid, difference, featureCollection, polygon, simplify } from '@turf/turf'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = 'ce1300'
const eraDir = path.join(root, 'static/data/eras', eraId)
const revisionPath = path.join(eraDir, 'revisions/2026-07-04T21-15-40Z.geojson')
const boundariesPath = path.join(eraDir, 'boundaries.geojson')

const MANUAL_ENTITIES = [
	{
		id: 'polotsk',
		nameEn: 'Principality of Polotsk',
		nameRu: 'Полоцкое княжество',
		box: [27, 55.0, 30.8, 56.9]
	},
	{
		id: 'chernigov',
		nameEn: 'Principality of Chernigov',
		nameRu: 'Черниговское княжество',
		box: [30.5, 52.8, 41.5, 56.0]
	}
]

function gapInBox(collection, [west, south, east, north]) {
	const box = polygon([
		[
			[west, south],
			[east, south],
			[east, north],
			[west, north],
			[west, south]
		]
	])

	let remaining = box
	for (const feature of collection.features) {
		try {
			const next = difference(featureCollection([remaining, feature]))
			if (next?.geometry) remaining = next
		} catch {
			// skip problematic boolean pair
		}
	}

	if (!remaining?.geometry) return null

	const simplified = simplify(remaining, { tolerance: 0.002, highQuality: false })
	if (!simplified?.geometry || area(simplified) < 1_000_000) return null

	return simplified
}

function asPolygonFeature(geometry, properties) {
	if (geometry.type === 'Polygon') {
		return { type: 'Feature', properties, geometry }
	}
	if (geometry.type === 'MultiPolygon' && geometry.coordinates.length === 1) {
		return {
			type: 'Feature',
			properties,
			geometry: { type: 'Polygon', coordinates: geometry.coordinates[0] }
		}
	}
	return { type: 'Feature', properties, geometry }
}

function loadJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, data) {
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

const collection = loadJson(revisionPath)
const existingIds = new Set(
	collection.features.map((feature) => feature.properties?.entity_id).filter(Boolean)
)

for (const entity of MANUAL_ENTITIES) {
	if (existingIds.has(entity.id)) {
		console.log(`Skip ${entity.id}: already in revision`)
		continue
	}

	const gap = gapInBox(collection, entity.box)
	if (!gap) throw new Error(`Failed to build geometry for ${entity.id}`)

	const feature = asPolygonFeature(gap.geometry, {
		entity_id: entity.id,
		name_en: entity.nameEn,
		source: 'manual-revision',
		manual_added_at: new Date().toISOString(),
		manual_note: 'Gap fill between Golden Horde and Smolensk'
	})

	collection.features.push(feature)
	console.log(
		`Added ${entity.id}: ${(area(feature) / 1e6).toFixed(0)} km², centroid`,
		centroid(feature).geometry.coordinates.map((v) => v.toFixed(2))
	)
}

writeJson(revisionPath, collection)
writeJson(boundariesPath, collection)

const entitiesPath = path.join(eraDir, 'entities.json')
const entities = loadJson(entitiesPath)
const entityIds = new Set(entities.map((entry) => entry.id))

for (const entity of MANUAL_ENTITIES) {
	if (entityIds.has(entity.id)) continue
	entities.push({
		id: entity.id,
		nameEn: entity.nameEn,
		nameRu: entity.nameRu
	})
}
entities.sort((a, b) => a.nameEn.localeCompare(b.nameEn))
writeJson(entitiesPath, entities)

const aliasesEnPath = path.join(eraDir, 'aliases.en.json')
const aliasesRuPath = path.join(eraDir, 'aliases.ru.json')
const aliasesEn = loadJson(aliasesEnPath)
const aliasesRu = loadJson(aliasesRuPath)

aliasesEn.polotsk = ['Principality of Polotsk', 'Polotsk', 'Polatsk']
aliasesEn.chernigov = ['Principality of Chernigov', 'Chernigov', 'Chernihiv']
aliasesRu.polotsk = ['Полоцкое княжество', 'Полоцк']
aliasesRu.chernigov = ['Черниговское княжество', 'Чернигов']

writeJson(aliasesEnPath, aliasesEn)
writeJson(aliasesRuPath, aliasesRu)

const metaPath = path.join(eraDir, 'meta.json')
const meta = loadJson(metaPath)
meta.entityCount = entities.length
meta.manualRusAdds = ['polotsk', 'chernigov']
writeJson(metaPath, meta)

const mappingAliasesEn = path.join(root, 'scripts/era-mappings/ce1300_aliases.en.json')
const mappingAliasesRu = path.join(root, 'scripts/era-mappings/ce1300_aliases.ru.json')
const mappingNamesRu = path.join(root, 'scripts/era-mappings/ce1300_names.ru.json')
const hybridPath = path.join(root, 'scripts/era-mappings/ce1300_hybrid.json')
const flagCuratedPath = path.join(root, 'scripts/era-mappings/ce1300_flag_curated.json')

if (fs.existsSync(mappingAliasesEn)) {
	const mappingEn = loadJson(mappingAliasesEn)
	mappingEn.polotsk = aliasesEn.polotsk
	mappingEn.chernigov = aliasesEn.chernigov
	writeJson(mappingAliasesEn, mappingEn)
}
if (fs.existsSync(mappingAliasesRu)) {
	const mappingRu = loadJson(mappingAliasesRu)
	mappingRu.polotsk = aliasesRu.polotsk
	mappingRu.chernigov = aliasesRu.chernigov
	writeJson(mappingAliasesRu, mappingRu)
}
if (fs.existsSync(mappingNamesRu)) {
	const namesRu = loadJson(mappingNamesRu)
	namesRu.polotsk = 'Полоцкое княжество'
	namesRu.chernigov = 'Черниговское княжество'
	writeJson(mappingNamesRu, namesRu)
}

if (fs.existsSync(hybridPath)) {
	const hybrid = loadJson(hybridPath)
	hybrid.cliopatria.add.push(
		{ name: 'Principality of Polotsk', id: 'polotsk', source: 'manual' },
		{ name: 'Principality of Chernigov', id: 'chernigov', source: 'manual' }
	)
	for (const id of ['polotsk', 'chernigov']) {
		if (!hybrid.clipGoldenHorde.subtractIds.includes(id)) {
			hybrid.clipGoldenHorde.subtractIds.push(id)
		}
	}
	writeJson(hybridPath, hybrid)
}

if (fs.existsSync(flagCuratedPath)) {
	const flags = loadJson(flagCuratedPath)
	flags.polotsk = 'commons:Pahonia.svg'
	flags.chernigov = 'commons:Coat of arms of Ruthenia (Герб Русі).svg'
	writeJson(flagCuratedPath, flags)
}

console.log(`Done. Entities: ${entities.length}. Updated revision and boundaries.`)
