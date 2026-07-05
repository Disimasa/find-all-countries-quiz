import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((arg) => arg.startsWith('--era='))?.split('=')[1] ?? 'preww1'
const dataDir = path.join(root, 'static/data/eras', eraId)
const mappingDir = path.join(root, 'scripts/era-mappings')
const outPath = path.join(mappingDir, `${eraId}_flag_sources.json`)
const curatedPath = path.join(mappingDir, `${eraId}_flag_curated.json`)

const COMMONS_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/'

function commonsUrl(fileName) {
	return `${COMMONS_BASE}${fileName}`
}

function parseCuratedEntry(entry) {
	if (entry.startsWith('commons:')) {
		return { type: 'commons', url: commonsUrl(entry.slice(8)) }
	}
	if (entry.startsWith('timemap:')) {
		return { type: 'timemap', file: entry.slice(8) }
	}
	if (entry.startsWith('iso:')) {
		return { type: 'iso', code: entry.slice(4) }
	}
	throw new Error(`Invalid curated entry: ${entry}`)
}

const curated = fs.existsSync(curatedPath)
	? JSON.parse(fs.readFileSync(curatedPath, 'utf8'))
	: {}
const entities = JSON.parse(fs.readFileSync(path.join(dataDir, 'entities.json'), 'utf8'))
const sources = {}
const unresolved = []

for (const entity of entities) {
	const entry = curated[entity.id]
	if (entry) {
		sources[entity.id] = parseCuratedEntry(entry)
		continue
	}
	unresolved.push(entity.id)
}

fs.mkdirSync(mappingDir, { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(sources, null, 2))

const commonsCount = Object.values(sources).filter((s) => s.type === 'commons').length
const timemapCount = Object.values(sources).filter((s) => s.type === 'timemap').length
const isoCount = Object.values(sources).filter((s) => s.type === 'iso').length

console.log(
	`Flag sources: ${Object.keys(sources).length}/${entities.length} (${commonsCount} commons, ${timemapCount} timemap, ${isoCount} iso)`
)
if (unresolved.length) {
	console.log(`Unresolved (${unresolved.length}): ${unresolved.join(', ')}`)
	process.exitCode = 1
}
