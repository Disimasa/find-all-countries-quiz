import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = 'preww1'
const flagsDir = path.join(root, 'static/flags/eras', eraId)
const sourcesPath = path.join(root, 'scripts/era-mappings', `${eraId}_flag_sources.json`)
const flagIconsDir = path.join(root, 'node_modules/country-flag-icons/3x2')
const USER_AGENT = 'find-all-countries-quiz/1.0 (educational)'

const MIN_BYTES = 400

async function fetchCommons(url) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
		if (response.ok) return response.text()
		if (response.status === 429) {
			await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
			continue
		}
		throw new Error(`HTTP ${response.status} for ${url}`)
	}
	throw new Error(`rate limited: ${url}`)
}

async function writeFlag(id, source) {
	const outFile = path.join(flagsDir, `${id}.svg`)
	if (source.type === 'iso') {
		const src = path.join(flagIconsDir, `${source.code}.svg`)
		if (!fs.existsSync(src)) throw new Error(`missing iso ${source.code}`)
		fs.copyFileSync(src, outFile)
		return `iso:${source.code}`
	}
	const text = await fetchCommons(source.url)
	if (!text.includes('<svg')) throw new Error('not svg')
	fs.writeFileSync(outFile, text)
	return source.url
}

const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'))
const entities = JSON.parse(
	fs.readFileSync(path.join(root, 'static/data/eras/preww1/entities.json'), 'utf8')
)

const FORCE_REFETCH = new Set([
	'danzig',
	'canada',
	'ghana',
	'vietnam-annam-cochin-china-tonkin',
	'vietnam-democratic-republic-of',
	'vietnam-republic-of',
	'sabah-north-borneo',
	'sarawak',
	'sri-lanka-ceylon',
	'new-guinea-german-new-guinea-kaiser-wilhelmsland',
	'papua-new-guinea'
])

const needs = entities
	.map((e) => e.id)
	.filter((id) => {
		if (FORCE_REFETCH.has(id)) return true
		const file = path.join(flagsDir, `${id}.svg`)
		return !fs.existsSync(file) || fs.statSync(file).size < MIN_BYTES
	})

console.log(`Repairing ${needs.length} flags...`)

const manifest = []
let ok = 0

for (const id of needs) {
	const source = sources[id]
	if (!source) {
		console.log('NO SOURCE', id)
		continue
	}
	try {
		await new Promise((r) => setTimeout(r, 2500))
		const src = await writeFlag(id, source)
		manifest.push({ entityId: id, file: `${id}.svg`, source: src })
		console.log('OK', id)
		ok++
	} catch (error) {
		console.log('FAIL', id, error.message)
	}
}

// Rebuild full manifest
const fullManifest = entities
	.filter((e) => fs.existsSync(path.join(flagsDir, `${e.id}.svg`)))
	.map((e) => {
		const source = sources[e.id]
		return {
			entityId: e.id,
			file: `${e.id}.svg`,
			source:
				source?.type === 'iso'
					? `iso:${source.code}`
					: source?.type === 'commons'
						? source.url
						: 'unknown'
		}
	})

fs.writeFileSync(path.join(flagsDir, 'manifest.json'), JSON.stringify(fullManifest, null, 2))
fs.writeFileSync(
	path.join(flagsDir, 'coverage.json'),
	JSON.stringify({
		total: entities.length,
		fetched: fullManifest.length,
		skipped: entities.length - fullManifest.length,
		skippedIds: entities.filter((e) => !fs.existsSync(path.join(flagsDir, `${e.id}.svg`))).map((e) => e.id)
	}, null, 2)
)

console.log(`Repaired ${ok}, total manifest ${fullManifest.length}/${entities.length}`)
