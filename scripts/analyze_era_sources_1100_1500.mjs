/**
 * Analyze historical-basemaps snapshots and Cliopatria for years 1100–1500.
 * Output: scripts/.cache/era_sources_report_1100_1500.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const cacheDir = path.join(root, 'scripts/.cache')
const outJson = path.join(cacheDir, 'era_sources_report_1100_1500.json')

const BASEMAP_YEARS = [1100, 1200, 1279, 1300, 1400, 1492, 1500]
const RUS_RE =
	/novgorod|ryazan|moscow|moskva|tver|vladimir|suzdal|smolensk|pskov|chernigov|galicia|volhynia|kyiv|kiev|kievan|rus principal|other rus|golden horde|mongol|lithuania|teuton|livonia|prussia|minsk|polotsk/i
const MONGOL_RE = /mongol|golden horde|great khan|yuan|chagatai|ilkhan|ulus|jochi/i
const HUNTER_RE =
	/hunter|gatherer|forager|tribe(?!s of)|culture$|mesolithic|neolithic|palaeolithic|paleolithic|chiefdoms$/i
const ALLEGIANCE_RE = /^\(allegiance|allegiance of/i

function normalizeName(name) {
	return String(name ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

function tokenSet(name) {
	return new Set(normalizeName(name).split(/\s+/).filter((t) => t.length > 2))
}

function nameSimilarity(a, b) {
	const na = normalizeName(a)
	const nb = normalizeName(b)
	if (!na || !nb) return 0
	if (na === nb) return 1
	if (na.includes(nb) || nb.includes(na)) return 0.85
	const ta = tokenSet(a)
	const tb = tokenSet(b)
	if (!ta.size || !tb.size) return 0
	let inter = 0
	for (const t of ta) if (tb.has(t)) inter++
	return inter / Math.max(ta.size, tb.size)
}

function matchNames(listA, listB, threshold = 0.6) {
	const matchedA = new Set()
	const matchedB = new Set()
	const pairs = []
	for (const a of listA) {
		let best = null
		let bestScore = 0
		for (const b of listB) {
			const s = nameSimilarity(a, b)
			if (s > bestScore) {
				bestScore = s
				best = b
			}
		}
		if (best && bestScore >= threshold) {
			matchedA.add(a)
			matchedB.add(best)
			pairs.push({ basemaps: a, cliopatria: best, score: Math.round(bestScore * 100) / 100 })
		}
	}
	return {
		pairs,
		basemapsOnly: listA.filter((n) => !matchedA.has(n)),
		cliopatriaOnly: listB.filter((n) => !matchedB.has(n)),
		jaccard:
			listA.length + listB.length - matchedA.size > 0
				? matchedA.size / (listA.length + listB.length - matchedA.size)
				: 0
	}
}

function ringVertexCount(ring) {
	return ring?.length ?? 0
}

function featureVertices(geom) {
	if (!geom) return 0
	if (geom.type === 'Polygon') {
		return geom.coordinates.reduce((s, r) => s + ringVertexCount(r), 0)
	}
	if (geom.type === 'MultiPolygon') {
		return geom.coordinates.reduce(
			(s, poly) => s + poly.reduce((s2, r) => s2 + ringVertexCount(r), 0),
			0
		)
	}
	return 0
}

function bboxOverlapFraction(f, west, south, east, north) {
	const coords = []
	const walk = (c) => {
		if (typeof c[0] === 'number') coords.push(c)
		else c.forEach(walk)
	}
	walk(f.geometry?.coordinates)
	if (!coords.length) return 0
	const inside = coords.filter(([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north)
	return inside.length / coords.length
}

function analyzeBasemaps(features) {
	const byName = new Map()
	let nullNames = 0
	const borderPrecision = {}
	const subjecto = new Set()
	const partof = new Set()
	let hierarchyEdges = 0
	let totalVertices = 0
	const names = []

	for (const f of features) {
		const p = f.properties ?? {}
		const name = (p.NAME ?? p.name ?? '').trim()
		if (!name) {
			nullNames++
			continue
		}
		names.push(name)
		byName.set(name, (byName.get(name) ?? 0) + 1)
		const bp = p.BORDERPRECISION ?? 'unknown'
		borderPrecision[bp] = (borderPrecision[bp] ?? 0) + 1
		if (p.SUBJECTO) subjecto.add(p.SUBJECTO)
		if (p.PARTOF) partof.add(p.PARTOF)
		if (p.SUBJECTO && p.PARTOF && p.SUBJECTO !== p.PARTOF) hierarchyEdges++
		totalVertices += featureVertices(f.geometry)
	}

	const uniqueNames = [...byName.keys()].sort()
	const duplicates = [...byName.entries()].filter(([, c]) => c > 1)
	const rus = uniqueNames.filter((n) => RUS_RE.test(n))
	const mongol = uniqueNames.filter((n) => MONGOL_RE.test(n))
	const hunters = uniqueNames.filter((n) => HUNTER_RE.test(n))
	const curatedLike = uniqueNames.filter((n) => !HUNTER_RE.test(n))

	return {
		featureCount: features.length,
		uniqueNames: uniqueNames.length,
		nullNameFeatures: nullNames,
		duplicateNameGroups: duplicates.length,
		duplicateFeatureCount: duplicates.reduce((s, [, c]) => s + c, 0),
		borderPrecision,
		distinctSubjecto: subjecto.size,
		distinctPartof: partof.size,
		hierarchyEdges,
		avgVerticesPerFeature: features.length ? Math.round(totalVertices / features.length) : 0,
		rusPolityCount: rus.length,
		rusPolities: rus,
		mongolPolityCount: mongol.length,
		mongolPolities: mongol,
		hunterGathererCount: hunters.length,
		curatedCandidateCount: curatedLike.length,
		names: uniqueNames
	}
}

function analyzeCliopatriaAtYear(allFeatures, year) {
	const active = allFeatures.filter((f) => {
		const p = f.properties ?? {}
		return year >= p.FromYear && year <= p.ToYear
	})

	const byName = new Map()
	const types = {}
	let allegianceCount = 0
	let parenCount = 0
	let withMemberOf = 0
	let withComponents = 0
	let withWikidata = 0
	let totalArea = 0
	let areaCount = 0
	const names = []

	for (const f of active) {
		const p = f.properties ?? {}
		const name = (p.Name ?? '').trim()
		if (!name) continue
		names.push(name)
		byName.set(name, (byName.get(name) ?? 0) + 1)
		const t = p.Type ?? 'unknown'
		types[t] = (types[t] ?? 0) + 1
		if (ALLEGIANCE_RE.test(name)) allegianceCount++
		if (name.startsWith('(')) parenCount++
		if (p.MemberOf) withMemberOf++
		if (p.Components) withComponents++
		if (p.Wikidata) withWikidata++
		if (p.Area) {
			totalArea += p.Area
			areaCount++
		}
	}

	const uniqueNames = [...byName.keys()].sort()
	const duplicates = [...byName.entries()].filter(([, c]) => c > 1)
	const rus = uniqueNames.filter((n) => RUS_RE.test(n) && !ALLEGIANCE_RE.test(n))
	const mongol = uniqueNames.filter((n) => MONGOL_RE.test(n) && !ALLEGIANCE_RE.test(n))
	const hunters = uniqueNames.filter((n) => HUNTER_RE.test(n))
	const polities = uniqueNames.filter((n) => !ALLEGIANCE_RE.test(n) && !n.startsWith('('))

	// Rus bbox: any feature with centroid in Rus
	const rusBboxNames = new Set()
	for (const f of active) {
		const name = (f.properties?.Name ?? '').trim()
		if (!name) continue
		if (bboxOverlapFraction(f, 22, 45, 50, 62) > 0.1) rusBboxNames.add(name)
	}

	return {
		activeFeatureCount: active.length,
		uniqueNames: uniqueNames.length,
		polityLikeNames: polities.length,
		duplicateNameGroups: duplicates.length,
		typeDistribution: types,
		allegianceEntries: allegianceCount,
		parentheticalNames: parenCount,
		withMemberOf,
		withComponents,
		withWikidata,
		avgAreaKm2: areaCount ? Math.round(totalArea / areaCount) : null,
		rusNameCount: rus.length,
		rusPolities: rus,
		rusBboxPolityCount: rusBboxNames.size,
		rusBboxSample: [...rusBboxNames].filter((n) => RUS_RE.test(n)).sort().slice(0, 20),
		mongolPolityCount: mongol.length,
		mongolPolities: mongol,
		hunterGathererCount: hunters.length,
		names: uniqueNames
	}
}

function scoreBasemaps(s, year) {
	let score = 3
	if (s.curatedCandidateCount >= 80) score += 0.5
	if (s.hierarchyEdges > 20) score += 0.3
	if (s.rusPolityCount >= 4) score += 0.5
	else if (s.rusPolityCount <= 2) score -= 0.5
	if (s.nullNameFeatures > 5) score -= 0.3
	if (year === 1279 && s.mongolPolityCount >= 1) score += 0.3
	if (year === 1200 && s.rusPolityCount >= 5) score += 0.5
	return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
}

function scoreCliopatria(s, year) {
	let score = 3
	if (s.polityLikeNames >= 100) score += 0.3
	if (s.withWikidata > s.activeFeatureCount * 0.5) score += 0.3
	if (s.rusPolityCount >= 4) score += 0.5
	else if (s.rusPolityCount <= 1 && s.rusBboxPolityCount <= 3) score -= 0.7
	if (s.allegianceEntries > s.uniqueNames * 0.15) score -= 0.3
	if (s.duplicateNameGroups > 30) score -= 0.2
	if ([1279, 1300].includes(year) && s.mongolPolityCount === 0) score -= 0.5
	return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
}

function scoreOverlap(m, rusOnly = false) {
	const a = rusOnly ? m.pairs.filter((p) => RUS_RE.test(p.basemaps) || RUS_RE.test(p.cliopatria)) : m.pairs
	const j = m.jaccard
	let score = 2 + j * 2
	if (a.length === 0 && rusOnly) score = 1
	if (m.basemapsOnly.length > 0 && m.cliopatriaOnly.length > 5) score -= 0.5
	return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
}

async function ensureBasemap(year) {
	const file = path.join(cacheDir, `world_${year}.geojson`)
	if (fs.existsSync(file)) return file
	const url = `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_${year}.geojson`
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Missing world_${year}.geojson: ${res.status}`)
	fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
	return file
}

async function ensureCliopatria() {
	const geoPath = path.join(cacheDir, 'cliopatria.geojson')
	if (fs.existsSync(geoPath)) return geoPath
	const zipPath = path.join(cacheDir, 'cliopatria.geojson.zip')
	const url =
		'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/main/cliopatria.geojson.zip'
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Cliopatria download failed: ${res.status}`)
	fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()))
	const { default: AdmZip } = await import('adm-zip')
	const zip = new AdmZip(zipPath)
	const entry = zip.getEntries().find((e) => e.entryName.endsWith('.geojson'))
	fs.writeFileSync(geoPath, zip.readAsText(entry))
	return geoPath
}

async function main() {
	const clioPath = await ensureCliopatria()
	const clioAll = JSON.parse(fs.readFileSync(clioPath, 'utf8')).features

	const report = {
		generatedAt: new Date().toISOString(),
		range: { from: 1100, to: 1500 },
		sources: {
			historicalBasemaps: {
				repo: 'https://github.com/aourednik/historical-basemaps',
				license: 'GPL-3.0',
				snapshotYears: BASEMAP_YEARS
			},
			cliopatria: {
				repo: 'https://github.com/Seshat-Global-History-Databank/cliopatria',
				license: 'CC BY 4.0',
				mode: 'filter by FromYear/ToYear at snapshot year'
			}
		},
		years: {}
	}

	for (const year of BASEMAP_YEARS) {
		const file = await ensureBasemap(year)
		const gj = JSON.parse(fs.readFileSync(file, 'utf8'))
		const basemaps = analyzeBasemaps(gj.features)
		const cliopatria = analyzeCliopatriaAtYear(clioAll, year)

		const overlapAll = matchNames(
			basemaps.names.filter((n) => !HUNTER_RE.test(n)),
			cliopatria.names.filter((n) => !ALLEGIANCE_RE.test(n) && !HUNTER_RE.test(n))
		)
		const overlapRus = matchNames(basemaps.rusPolities, cliopatria.rusPolities, 0.5)

		report.years[year] = {
			basemaps: {
				...basemaps,
				qualityScore: scoreBasemaps(basemaps, year),
				fileSizeMb: Math.round((fs.statSync(file).size / 1024 / 1024) * 100) / 100
			},
			cliopatria: {
				...cliopatria,
				qualityScore: scoreCliopatria(cliopatria, year)
			},
			overlap: {
				allPolities: {
					matchedPairs: overlapAll.pairs.length,
					jaccardNameSimilarity: Math.round(overlapAll.jaccard * 1000) / 1000,
					basemapsOnlyCount: overlapAll.basemapsOnly.length,
				cliopatriaOnlyCount: overlapAll.cliopatriaOnly.length,
					basemapsOnlySample: overlapAll.basemapsOnly.slice(0, 15),
					cliopatriaOnlySample: overlapAll.cliopatriaOnly.slice(0, 15),
					topMatches: overlapAll.pairs.slice(0, 20),
					overlapQualityScore: scoreOverlap(overlapAll)
				},
				rusPolities: {
					matchedPairs: overlapRus.pairs.length,
					jaccardNameSimilarity: Math.round(overlapRus.jaccard * 1000) / 1000,
					basemapsOnly: overlapRus.basemapsOnly,
					cliopatriaOnly: overlapRus.cliopatriaOnly,
					matches: overlapRus.pairs,
					overlapQualityScore: scoreOverlap(overlapRus, true)
				}
			}
		}
		// omit full name lists from JSON to keep size down
		delete report.years[year].basemaps.names
		delete report.years[year].cliopatria.names
	}

	fs.writeFileSync(outJson, JSON.stringify(report, null, 2))
	console.log('Wrote', outJson)
	for (const y of BASEMAP_YEARS) {
		const r = report.years[y]
		console.log(
			y,
			'BM',
			r.basemaps.uniqueNames,
			'CL',
			r.cliopatria.polityLikeNames,
			'Rus BM/CL',
			r.basemaps.rusPolityCount,
			r.cliopatria.rusPolityCount,
			'overlap',
			r.overlap.allPolities.jaccardNameSimilarity
		)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
