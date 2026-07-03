import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const cacheDir = path.join(root, 'scripts/.cache')

const args = Object.fromEntries(
	process.argv.slice(2).map((arg) => {
		const [key, value] = arg.replace(/^--/, '').split('=')
		return [key, value ?? true]
	})
)

const eraId = args.era ?? 'ce100'
const snapshotYear = Number(args.year ?? 100)
const curatedPath =
	args.curated ?? path.join(root, 'scripts/era-mappings', `${eraId}_curated.json`)
const outDir = path.join(root, 'static/data/eras', eraId)

const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'))
const includeSet = new Set(curated.include)
const slugOverrides = curated.slugOverrides ?? {}

const aliasesEnPath = path.join(root, 'scripts/era-mappings', `${eraId}_aliases.en.json`)
const extraAliasesEn = fs.existsSync(aliasesEnPath)
	? JSON.parse(fs.readFileSync(aliasesEnPath, 'utf8'))
	: {}

function slugify(name) {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function resolveEntityId(nameEn) {
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
		geometry: { type: geometryType, coordinates: geometryType === 'Polygon' ? polygons[0] : polygons }
	}
}

async function ensureBasemap() {
	const fileName = `world_${snapshotYear}.geojson`
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

async function main() {
	const cacheFile = await ensureBasemap()
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
		console.warn('Missing from source GeoJSON:', missing.join(', '))
	}

	const entities = []
	const aliasesEn = {}
	const features = []

	for (const [nameEn, group] of groups) {
		const entityId = resolveEntityId(nameEn)
		const merged = mergeFeatures(group)
		merged.properties = {
			...merged.properties,
			entity_id: entityId,
			name_en: nameEn
		}
		features.push(merged)

		const extras = extraAliasesEn[entityId] ?? []
		const enAliases = [...new Set([nameEn, ...extras])]

		entities.push({
			id: entityId,
			nameEn,
			nameRu: nameEn,
			region: merged.properties?.PARTOF ?? undefined
		})

		aliasesEn[entityId] = enAliases
	}

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
				source: curated.source ?? 'historical-basemaps',
				sourceUrl:
					'https://github.com/aourednik/historical-basemaps',
				rejectedSources: [
					'CShapes 2.0 (starts 1886)',
					'OpenHistoricalMap (no global snapshot for 100 CE)',
					'Cliopatria (fallback if GPL becomes an issue)'
				]
			},
			null,
			2
		)
	)

	console.log(`Wrote ${entities.length} entities to ${outDir}`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
