/**
 * Build a hybrid era dataset: historical-basemaps + Cliopatria overlays.
 * Usage: node scripts/prepare_hybrid_era.mjs --era=ce1300
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import { difference, featureCollection } from '@turf/turf'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const cacheDir = path.join(root, 'scripts/.cache')

const args = Object.fromEntries(
	process.argv.slice(2).map((arg) => {
		const [key, value] = arg.replace(/^--/, '').split('=')
		return [key, value ?? true]
	})
)

const eraId = args.era ?? 'ce1300'
const mappingDir = path.join(root, 'scripts/era-mappings')
const hybridPath = path.join(mappingDir, `${eraId}_hybrid.json`)
const curatedPath = path.join(mappingDir, `${eraId}_curated.json`)
const outDir = path.join(root, 'static/data/eras', eraId)

const hybrid = JSON.parse(fs.readFileSync(hybridPath, 'utf8'))
const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'))
const snapshotYear = hybrid.snapshotYear ?? curated.snapshotYear ?? 1300

const aliasesEnPath = path.join(mappingDir, `${eraId}_aliases.en.json`)
const extraAliasesEn = fs.existsSync(aliasesEnPath)
	? JSON.parse(fs.readFileSync(aliasesEnPath, 'utf8'))
	: {}

const displayNameOverrides = hybrid.displayNameOverrides ?? {
	'great-khanate': 'Yuan'
}

function slugify(name) {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function resolveEntityId(nameEn, slugOverrides) {
	return slugOverrides[nameEn] ?? slugify(nameEn)
}

function getCountryName(props) {
	return props?.NAME ?? props?.name ?? 'Unknown'
}

function mergeFeatures(features) {
	if (features.length === 1) return features[0]
	const geometryType = features.some((f) => f.geometry?.type === 'MultiPolygon')
		? 'MultiPolygon'
		: 'Polygon'
	const polygons = []
	for (const feature of features) {
		const geom = feature.geometry
		if (!geom) continue
		if (geom.type === 'Polygon') polygons.push(geom.coordinates)
		if (geom.type === 'MultiPolygon') polygons.push(...geom.coordinates)
	}
	return {
		type: 'Feature',
		properties: { ...features[0].properties },
		geometry: {
			type: geometryType,
			coordinates: geometryType === 'Polygon' ? polygons[0] : polygons
		}
	}
}

function activeAtYear(feature, year) {
	const props = feature.properties ?? {}
	const from = props.FromYear ?? props.From ?? 0
	const to = props.ToYear ?? props.To ?? 9999
	return year >= from && year <= to
}

async function ensureBasemap(year) {
	const fileName = `world_${year}.geojson`
	const cacheFile = path.join(cacheDir, fileName)
	if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
	if (fs.existsSync(cacheFile)) return cacheFile

	const url = `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/${fileName}`
	console.log(`Downloading ${url}…`)
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to download ${fileName}: ${response.status}`)
	const buffer = Buffer.from(await response.arrayBuffer())
	fs.writeFileSync(cacheFile, buffer)
	console.log(`Cached ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)
	return cacheFile
}

async function ensureCliopatria() {
	const geoPath = path.join(cacheDir, 'cliopatria.geojson')
	const zipPath = path.join(cacheDir, 'cliopatria.geojson.zip')
	if (fs.existsSync(geoPath)) return geoPath

	const url =
		'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/main/cliopatria.geojson.zip'
	console.log(`Downloading Cliopatria…`)
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to download Cliopatria: ${response.status}`)
	fs.writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()))
	const zip = new AdmZip(zipPath)
	zip.extractAllTo(cacheDir, true)
	if (!fs.existsSync(geoPath)) throw new Error('cliopatria.geojson not found after extract')
	return geoPath
}

function loadCliopatriaFeatures(clioCollection, year, addList) {
	const result = []
	const missing = []
	for (const entry of addList) {
		const group = clioCollection.features.filter((feature) => {
			const props = feature.properties ?? {}
			if (props.Name !== entry.name) return false
			if (entry.fromYear != null) {
				return props.FromYear === entry.fromYear && props.ToYear === entry.toYear
			}
			return activeAtYear(feature, year)
		})
		if (!group.length) {
			missing.push(entry.name)
			continue
		}
		const merged = mergeFeatures(group)
		const displayName = entry.displayName ?? entry.name
		merged.properties = {
			...merged.properties,
			entity_id: entry.id,
			name_en: displayName,
			source: 'cliopatria',
			...(entry.fromYear != null
				? { cliopatria_period: `${entry.fromYear}-${entry.toYear}` }
				: {})
		}
		result.push(merged)
	}
	if (missing.length) console.warn('Missing from Cliopatria @' + year + ':', missing.join(', '))
	return result
}

function clipFeature(features, clipConfig) {
	if (!clipConfig) return false
	const targetId = clipConfig.targetId
	const subtractIds = clipConfig.subtractIds ?? []
	const targetIdx = features.findIndex((f) => f.properties?.entity_id === targetId)
	if (targetIdx < 0) {
		console.warn(`Clip target not found: ${targetId}`)
		return false
	}

	const subtractFeatures = features.filter((f) => subtractIds.includes(f.properties?.entity_id))
	if (!subtractFeatures.length) {
		console.warn(`No subtract features for ${targetId} clip`)
		return false
	}

	try {
		const clipped = difference(featureCollection([features[targetIdx], ...subtractFeatures]))
		if (!clipped?.geometry) {
			console.warn(`${targetId} clip returned empty geometry; keeping original`)
			return false
		}
		clipped.properties = {
			...features[targetIdx].properties,
			clipped_by: subtractIds
		}
		features[targetIdx] = clipped
		console.log(`Clipped ${targetId} by ${subtractFeatures.length} polities`)
		return true
	} catch (error) {
		console.warn(`${targetId} clip failed:`, error.message)
		return false
	}
}

function applyClipRules(features, hybrid) {
	const rules = [
		...(hybrid.clipParents ?? []),
		...(hybrid.clipGoldenHorde ? [hybrid.clipGoldenHorde] : [])
	]
	for (const rule of rules) {
		clipFeature(features, rule)
	}
}

async function main() {
	const includeSet = new Set(curated.include)
	const slugOverrides = curated.slugOverrides ?? {}

	const cacheFile = await ensureBasemap(snapshotYear)
	const collection = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
	const groups = new Map()

	for (const feature of collection.features) {
		const nameEn = getCountryName(feature.properties ?? {})
		if (!nameEn || !includeSet.has(nameEn)) continue
		const list = groups.get(nameEn) ?? []
		list.push(feature)
		groups.set(nameEn, list)
	}

	const missing = [...includeSet].filter((name) => !groups.has(name))
	if (missing.length) {
		console.warn('Missing from basemaps GeoJSON:', missing.join(', '))
	}

	const entities = []
	const aliasesEn = {}
	const features = []

	for (const [nameEn, group] of groups) {
		const entityId = resolveEntityId(nameEn, slugOverrides)
		const displayName = displayNameOverrides[entityId] ?? nameEn
		const merged = mergeFeatures(group)
		merged.properties = {
			...merged.properties,
			entity_id: entityId,
			name_en: displayName,
			source: 'historical-basemaps'
		}
		features.push(merged)

		const extras = extraAliasesEn[entityId] ?? []
		const enAliases = [...new Set([displayName, nameEn, ...extras].filter(Boolean))]

		entities.push({
			id: entityId,
			nameEn: displayName,
			nameRu: displayName,
			region: merged.properties?.PARTOF ?? undefined
		})

		aliasesEn[entityId] = enAliases
	}

	const clioPath = await ensureCliopatria()
	const clioCollection = JSON.parse(fs.readFileSync(clioPath, 'utf8'))
	const clioFeatures = loadCliopatriaFeatures(
		clioCollection,
		snapshotYear,
		hybrid.cliopatria.add
	)

	for (const feature of clioFeatures) {
		const entityId = feature.properties.entity_id
		const nameEn = feature.properties.name_en
		if (entities.some((e) => e.id === entityId)) {
			console.warn(`Skipping duplicate Cliopatria entity: ${entityId}`)
			continue
		}
		features.push(feature)
		const extras = extraAliasesEn[entityId] ?? []
		const enAliases = [...new Set([nameEn, ...extras])]
		entities.push({
			id: entityId,
			nameEn,
			nameRu: nameEn,
			region: undefined
		})
		aliasesEn[entityId] = enAliases
	}

	applyClipRules(features, hybrid)

	entities.sort((a, b) => a.nameEn.localeCompare(b.nameEn))

	const aliasesRu = Object.fromEntries(
		entities.map((entity) => [entity.id, [entity.nameEn]])
	)

	fs.mkdirSync(outDir, { recursive: true })
	fs.writeFileSync(
		path.join(outDir, 'boundaries.geojson'),
		JSON.stringify({ type: 'FeatureCollection', features })
	)
	fs.writeFileSync(path.join(outDir, 'entities.json'), JSON.stringify(entities, null, 2))
	fs.writeFileSync(path.join(outDir, 'aliases.en.json'), JSON.stringify(aliasesEn, null, 2))
	fs.writeFileSync(path.join(outDir, 'aliases.ru.json'), JSON.stringify(aliasesRu, null, 2))
	fs.writeFileSync(
		path.join(outDir, 'meta.json'),
		JSON.stringify(
			{
				eraId,
				snapshotYear,
				entityCount: entities.length,
				source: hybrid.source,
				sources: {
					basemaps:
						'https://github.com/aourednik/historical-basemaps',
					cliopatria:
						'https://github.com/Seshat-Global-History-Databank/cliopatria'
				},
				cliopatriaAddCount: clioFeatures.length,
				license: {
					basemaps: 'GPL-3.0',
					cliopatria: 'CC BY 4.0'
				}
			},
			null,
			2
		)
	)

	console.log(
		`Wrote ${entities.length} entities (${groups.size} basemaps + ${clioFeatures.length} cliopatria) to ${outDir}`
	)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
