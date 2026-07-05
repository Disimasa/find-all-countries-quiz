import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { normalizeSvgBuffer } from './lib/flags/svg.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((a) => a.startsWith('--era='))?.split('=')[1] ?? 'ce100'
const flagsDir = path.join(root, 'static/flags/eras', eraId)
const sourcesPath = path.join(root, 'scripts/era-mappings', `${eraId}_flag_sources.json`)
const entitiesPath = path.join(root, `static/data/eras/${eraId}/entities.json`)
const flagIconsDir = path.join(root, 'node_modules/country-flag-icons/3x2')
const USER_AGENT = 'find-all-countries-quiz/1.0 (educational)'
const PAUSE_MS = 5_000
const MAX_RETRIES = 3

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function sourceKey(source) {
	if (source.type === 'iso') return `iso:${source.code}`
	if (source.type === 'timemap') return `timemap:${source.file}`
	return source.url
}

function cachePath(key, ext = 'svg') {
	return path.join(flagsDir, `.cache-${createHash('sha1').update(key).digest('hex').slice(0, 16)}.${ext}`)
}

async function commonsDirectUrl(commonsFileName) {
	const title = encodeURIComponent(`File:${commonsFileName}`)
	for (let attempt = 0; attempt < 6; attempt++) {
		const response = await fetch(
			`https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url&format=json`,
			{ headers: { 'User-Agent': USER_AGENT } }
		)
		if (response.status === 429) {
			await delay(6000 * (attempt + 1))
			continue
		}
		const json = await response.json()
		const url = Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0]?.url
		if (url) return url
		break
	}
	return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsFileName)}`
}

async function commonsThumbPng(commonsFileName) {
	const title = encodeURIComponent(`File:${commonsFileName}`)
	const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=640&format=json`
	for (let attempt = 0; attempt < 4; attempt++) {
		const response = await fetch(api, { headers: { 'User-Agent': USER_AGENT } })
		if (response.status === 429) {
			await delay(5000 * (attempt + 1))
			continue
		}
		const json = await response.json()
		const thumbUrl = Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0]?.thumburl
		if (!thumbUrl) return null
		const thumbResponse = await fetch(thumbUrl, { headers: { 'User-Agent': USER_AGENT } })
		if (!thumbResponse.ok) return null
		const buffer = Buffer.from(await thumbResponse.arrayBuffer())
		if (buffer.length < 200) return null
		return buffer
	}
	return null
}

async function fetchPayload(source) {
	if (source.type === 'iso') {
		return {
			kind: 'svg',
			text: normalizeSvgBuffer(fs.readFileSync(path.join(flagIconsDir, `${source.code}.svg`)))
		}
	}

	let urls = []
	if (source.type === 'timemap') {
		urls = [`https://images.timemap.org/s/${source.file}`]
	} else {
		const file = decodeURIComponent(source.url.split('/Special:FilePath/')[1] ?? '')
		urls = [
			await commonsDirectUrl(file),
			`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
		]
	}

	for (const url of [...new Set(urls)]) {
		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			const response = await fetch(url, {
				headers: { 'User-Agent': USER_AGENT },
				signal: AbortSignal.timeout(120_000)
			})
			if (response.status === 429) {
				await delay(5000 * (attempt + 1))
				continue
			}
			if (!response.ok) break
			const buffer = Buffer.from(await response.arrayBuffer())
			const contentType = response.headers.get('content-type') ?? ''
			const head = buffer.toString('utf8', 0, 200)
			if (contentType.includes('svg') || head.includes('<svg')) {
				return { kind: 'svg', text: normalizeSvgBuffer(buffer) }
			}
			if (contentType.includes('png') || contentType.includes('jpeg') || contentType.includes('jpg')) {
				return { kind: contentType.includes('png') ? 'png' : 'jpg', buffer }
			}
			break
		}
	}
	if (source.type !== 'timemap' && source.type !== 'iso') {
		const file = decodeURIComponent(source.url.split('/Special:FilePath/')[1] ?? '')
		const png = file ? await commonsThumbPng(file) : null
		if (png) return { kind: 'png', buffer: png }
	}
	throw new Error('fetch failed')
}

const entities = JSON.parse(fs.readFileSync(entitiesPath, 'utf8'))
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'))
const groups = new Map()

const onlyMissing = process.argv.includes('--only-missing')
const coveragePath = path.join(flagsDir, 'coverage.json')
const skippedIds = onlyMissing && fs.existsSync(coveragePath)
	? new Set(JSON.parse(fs.readFileSync(coveragePath, 'utf8')).skippedIds ?? [])
	: null

for (const entity of entities) {
	const source = sources[entity.id]
	if (!source) continue
	if (skippedIds && !skippedIds.has(entity.id)) continue
	const key = sourceKey(source)
	if (!groups.has(key)) groups.set(key, { source, ids: [] })
	groups.get(key).ids.push(entity.id)
}

console.log(`Slow refetch ${groups.size} unique sources for ${eraId}...`)

let ok = 0
for (const [key, group] of groups) {
	await delay(PAUSE_MS)
	try {
		const payload = await fetchPayload(group.source)
		const ext = payload.kind === 'svg' ? 'svg' : payload.kind
		const cache = cachePath(key, ext)
		if (payload.kind === 'svg') fs.writeFileSync(cache, payload.text)
		else fs.writeFileSync(cache, payload.buffer)

		for (const id of group.ids) {
			const out = path.join(flagsDir, `${id}.${ext}`)
			if (payload.kind === 'svg') fs.writeFileSync(out, payload.text)
			else fs.writeFileSync(out, payload.buffer)
		}
		const size = payload.kind === 'svg' ? payload.text.length : payload.buffer.length
		console.log('OK', group.ids.join(','), ext, size)
		ok++
	} catch (error) {
		console.log('FAIL', group.ids[0], error.message)
	}
}

console.log(`Done ${ok}/${groups.size} sources`)
