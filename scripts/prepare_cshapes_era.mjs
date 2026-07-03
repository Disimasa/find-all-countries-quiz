import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getGroupKey, isActiveOnDate } from './cshapes_date.mjs'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const cacheDir = path.join(root, 'scripts/.cache')
const cshapesUrl = 'https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson'
const cshapesCache = path.join(cacheDir, 'CShapes-2.0.geojson')

const args = Object.fromEntries(
	process.argv.slice(2).map((arg) => {
		const [key, value] = arg.replace(/^--/, '').split('=')
		return [key, value ?? true]
	})
)

const eraId = args.era ?? 'preww1'
const snapshotDate = new Date(args.date ?? '1914-07-28')
const outDir = path.join(root, 'static/data/eras', eraId)

const EXCLUDED_MICRO = new Set([
	'Andorra',
	'Liechtenstein',
	'Monaco',
	'San Marino',
	'Vatican',
	'Luxembourg',
	'Montenegro',
	'Albania'
])

const SLUG_OVERRIDES = {
	'United States of America': 'united-states',
	'United Kingdom': 'united-kingdom',
	'Russia (Soviet Union)': 'russia-soviet-union',
	'Germany (Prussia)': 'germany-prussia',
	'Austria-Hungary': 'austria-hungary',
	'Turkey (Ottoman Empire)': 'turkey-ottoman-empire',
	China: 'qing-china',
	'Iran (Persia)': 'persia',
	Korea: 'korea-empire',
	France: 'france',
	Netherlands: 'netherlands',
	Belgium: 'belgium',
	Portugal: 'portugal',
	Spain: 'spain',
	'Italy/Sardinia': 'italy',
	Denmark: 'denmark',
	Sweden: 'sweden',
	Norway: 'norway',
	Switzerland: 'switzerland',
	Greece: 'greece',
	Rumania: 'romania',
	Bulgaria: 'bulgaria',
	Serbia: 'serbia',
	Japan: 'japan',
	Brazil: 'brazil',
	Argentina: 'argentina',
	Chile: 'chile',
	Mexico: 'mexico',
	Canada: 'canada',
	Australia: 'australia',
	India: 'british-india',
	Indonesia: 'dutch-east-indies',
	'Vietnam (Annam/Cochin China/Tonkin)': 'vietnam-annam-cochin-china-tonkin',
	Algeria: 'french-algeria',
	Morocco: 'french-morocco',
	Tunisia: 'french-tunisia',
	Egypt: 'egypt',
	'South Africa': 'union-of-south-africa'
}

/** CShapes splits these into separate gwcode polities; merge into metropolitan parent for the era. */
const MERGE_INTO_PARENT_BY_ID = {
	alaska: 'united-states',
	hawaii: 'united-states',
	'puerto-rico': 'united-states',
	'southern-sakhalin-island': 'japan',
	iceland: 'denmark'
}

const PARENT_DISPLAY_NAMES = {
	'united-states': 'United States of America',
	japan: 'Japan',
	denmark: 'Denmark'
}

function resolveEntityId(nameEn) {
	if (SLUG_OVERRIDES[nameEn]) return SLUG_OVERRIDES[nameEn]
	return slugify(nameEn)
}

const ENTITY_ISO_FLAGS = {
	sweden: 'SE',
	switzerland: 'CH',
	norway: 'NO',
	denmark: 'DK',
	spain: 'ES',
	portugal: 'PT',
	greece: 'GR',
	romania: 'RO',
	bulgaria: 'BG',
	serbia: 'RS',
	japan: 'JP',
	brazil: 'BR',
	argentina: 'AR',
	chile: 'CL',
	mexico: 'MX',
	australia: 'AU',
	france: 'FR',
	belgium: 'BE',
	netherlands: 'NL',
	italy: 'IT',
	'united-kingdom': 'GB',
	'united-states': 'US',
	canada: 'CA'
}

function slugify(name) {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function getCountryName(props) {
	return (
		props.cntry_name ??
		props.CNTRY_NAME ??
		props.countryname ??
		props.COUNTRYNAME ??
		props.NAME ??
		props.name ??
		'Unknown'
	)
}

async function ensureCShapes() {
	if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
	if (fs.existsSync(cshapesCache)) return
	console.log('Downloading CShapes 2.0…')
	const response = await fetch(cshapesUrl)
	if (!response.ok) throw new Error(`Failed to download CShapes: ${response.status}`)
	const buffer = Buffer.from(await response.arrayBuffer())
	fs.writeFileSync(cshapesCache, buffer)
	console.log(`Cached ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)
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

async function main() {
	await ensureCShapes()
	const collection = JSON.parse(fs.readFileSync(cshapesCache, 'utf8'))
	const active = collection.features.filter((feature) => isActiveOnDate(feature, snapshotDate))
	const groups = new Map()

	for (const feature of active) {
		const key = getGroupKey(feature.properties ?? {})
		const list = groups.get(key) ?? []
		list.push(feature)
		groups.set(key, list)
	}

	const entities = []
	const aliasesEn = {}
	const aliasesRu = {}
	const features = []
	const pending = new Map()

	for (const [, group] of groups) {
		const merged = mergeFeatures(group)
		const nameEn = getCountryName(merged.properties ?? {})
		if (EXCLUDED_MICRO.has(nameEn)) continue

		const entityId = resolveEntityId(nameEn)
		if (!entityId) continue

		const parentId = MERGE_INTO_PARENT_BY_ID[entityId]
		const targetId = parentId ?? entityId
		const bucket = pending.get(targetId) ?? { entityId: targetId, nameEn: null, parts: [] }
		if (!parentId) bucket.nameEn = nameEn
		bucket.parts.push(merged)
		pending.set(targetId, bucket)
	}

	for (const [entityId, bucket] of pending) {
		if (MERGE_INTO_PARENT_BY_ID[entityId]) continue
		if (!bucket.nameEn) {
			bucket.nameEn = PARENT_DISPLAY_NAMES[entityId] ?? entityId
		}

		const merged = mergeFeatures(bucket.parts)
		merged.properties = {
			...merged.properties,
			entity_id: entityId,
			name_en: bucket.nameEn
		}
		features.push(merged)

		const flagCode = ENTITY_ISO_FLAGS[entityId]

		entities.push({
			id: entityId,
			nameEn: bucket.nameEn,
			nameRu: bucket.nameEn,
			region: merged.properties?.continent ?? merged.properties?.REGION ?? undefined,
			...(flagCode ? { flagCode } : {})
		})

		aliasesEn[entityId] = [bucket.nameEn]
		aliasesRu[entityId] = [bucket.nameEn]
	}

	entities.sort((a, b) => a.nameEn.localeCompare(b.nameEn))
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
				snapshotDate: snapshotDate.toISOString().slice(0, 10),
				entityCount: entities.length,
				source: 'CShapes 2.0'
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
