import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((arg) => arg.startsWith('--era='))?.split('=')[1] ?? 'preww1'
const flagsDir = path.join(root, 'static/flags/eras', eraId)
const sourcesPath = path.join(root, 'scripts/era-mappings', `${eraId}_flag_sources.json`)
const flagIconsDir = path.join(root, 'node_modules/country-flag-icons/3x2')
const USER_AGENT = 'find-all-countries-quiz/1.0 (educational)'

const FETCH_DELAY_MS = 600

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchCommons(url) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
		if (response.ok) return response.text()
		if (response.status === 429) {
			await delay(3000 * (attempt + 1))
			continue
		}
		throw new Error(`HTTP ${response.status}`)
	}
	throw new Error(`rate limited: ${url}`)
}

const entities = JSON.parse(
	fs.readFileSync(path.join(root, `static/data/eras/${eraId}/entities.json`), 'utf8')
)
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'))
fs.mkdirSync(flagsDir, { recursive: true })

const groups = new Map()

for (const entity of entities) {
	const source = sources[entity.id]
	if (!source) continue
	const key = source.type === 'iso' ? `iso:${source.code}` : source.url
	if (!groups.has(key)) groups.set(key, { source, ids: [] })
	groups.get(key).ids.push(entity.id)
}

console.log(`Unique sources: ${groups.size}`)

const manifest = []

for (const [key, group] of groups) {
	const cacheFile = path.join(
		flagsDir,
		`.cache-${createHash('sha1').update(key).digest('hex').slice(0, 16)}.svg`
	)
	let svg

	if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 200) {
		svg = fs.readFileSync(cacheFile, 'utf8')
	} else if (group.source.type === 'iso') {
		const src = path.join(flagIconsDir, `${group.source.code}.svg`)
		if (!fs.existsSync(src)) {
			console.log('MISSING ISO', group.source.code, group.ids[0])
			continue
		}
		svg = fs.readFileSync(src, 'utf8')
		fs.writeFileSync(cacheFile, svg)
	} else {
		try {
			await delay(FETCH_DELAY_MS)
			const response = await fetch(group.source.url, {
				headers: { 'User-Agent': USER_AGENT }
			})
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const contentType = response.headers.get('content-type') ?? ''
			const buffer = Buffer.from(await response.arrayBuffer())
			if (contentType.includes('svg') || buffer.toString('utf8', 0, 200).includes('<svg')) {
				svg = buffer.toString('utf8')
				fs.writeFileSync(cacheFile, svg)
			} else if (contentType.includes('image/png')) {
				fs.writeFileSync(cacheFile.replace(/\.svg$/, '.png'), buffer)
				svg = null
				group.assetExt = 'png'
				group.assetBuffer = buffer
			} else {
				throw new Error(`unsupported type: ${contentType}`)
			}
			console.log('FETCHED', key.slice(0, 60))
		} catch (error) {
			console.log('FAIL', group.ids[0], error.message)
			continue
		}
	}

	for (const id of group.ids) {
		const ext = group.assetExt ?? 'svg'
		const payload = ext === 'png' ? group.assetBuffer : svg
		if (!payload) continue
		const fileName = `${id}.${ext}`
		const out = path.join(flagsDir, fileName)
		fs.writeFileSync(out, payload)
		manifest.push({
			entityId: id,
			file: fileName,
			source: key
		})
	}
}

const fetchedIds = new Set(manifest.map((m) => m.entityId))
const skippedIds = entities.map((e) => e.id).filter((id) => !fetchedIds.has(id))

fs.writeFileSync(path.join(flagsDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(
	path.join(flagsDir, 'coverage.json'),
	JSON.stringify(
		{
			total: entities.length,
			fetched: manifest.length,
			skipped: skippedIds.length,
			skippedIds
		},
		null,
		2
	)
)

console.log(`Materialized ${manifest.length}/${entities.length} flags`)
