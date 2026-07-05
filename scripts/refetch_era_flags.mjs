import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { decodeSvgBuffer, isValidSvgText, normalizeSvgBuffer, sanitizeSvgText } from './lib/flags/svg.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((a) => a.startsWith('--era='))?.split('=')[1] ?? 'ce1300'
const onlyBroken = process.argv.includes('--broken')
const idsArg = process.argv.find((a) => a.startsWith('--ids='))?.split('=')[1]
const targetIds = idsArg ? new Set(idsArg.split(',').map((s) => s.trim()).filter(Boolean)) : null

const flagsDir = path.join(root, 'static/flags/eras', eraId)
const sourcesPath = path.join(root, 'scripts/era-mappings', `${eraId}_flag_sources.json`)
const flagIconsDir = path.join(root, 'node_modules/country-flag-icons/3x2')
const USER_AGENT = 'find-all-countries-quiz/1.0 (educational)'
const FETCH_DELAY_MS = 3000

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function sourceKey(source) {
	if (source.type === 'iso') return `iso:${source.code}`
	if (source.type === 'timemap') return `timemap:${source.file}`
	return source.url
}

function cachePath(key) {
	return path.join(flagsDir, `.cache-${createHash('sha1').update(key).digest('hex').slice(0, 16)}.svg`)
}

function fileIssues(filePath) {
	if (!fs.existsSync(filePath)) return ['missing']
	const buf = fs.readFileSync(filePath)
	const ext = path.extname(filePath).toLowerCase()
	if (ext !== '.svg') return []
	const { encoding, text } = decodeSvgBuffer(buf)
	const issues = []
	if (encoding !== 'utf8') issues.push('utf16')
	if (!isValidSvgText(sanitizeSvgText(text))) issues.push('invalid')
	return issues
}

async function commonsDirectUrl(commonsFileName) {
	const title = encodeURIComponent(`File:${commonsFileName}`)
	const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url&format=json`
	for (let attempt = 0; attempt < 5; attempt++) {
		const response = await fetch(api, { headers: { 'User-Agent': USER_AGENT } })
		if (response.status === 429) {
			await delay(4000 * (attempt + 1))
			continue
		}
		if (!response.ok) break
		const json = await response.json()
		const page = Object.values(json.query?.pages ?? {})[0]
		const url = page?.imageinfo?.[0]?.url
		if (url) return url
		break
	}
	return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsFileName)}`
}

async function fetchPayload(source) {
	if (source.type === 'iso') {
		const src = path.join(flagIconsDir, `${source.code}.svg`)
		if (!fs.existsSync(src)) throw new Error(`missing iso ${source.code}`)
		return { kind: 'svg', text: normalizeSvgBuffer(fs.readFileSync(src)) }
	}

	let fetchUrl
	if (source.type === 'timemap') {
		fetchUrl = `https://images.timemap.org/s/${source.file}`
	} else {
		const fileName = decodeURIComponent(source.url.split('/Special:FilePath/')[1] ?? '')
		fetchUrl = fileName ? await commonsDirectUrl(fileName) : source.url
	}

	for (let attempt = 0; attempt < 6; attempt++) {
		const response = await fetch(fetchUrl, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(120_000)
		})
		if (response.status === 429) {
			await delay(4000 * (attempt + 1))
			continue
		}
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		const buffer = Buffer.from(await response.arrayBuffer())
		const contentType = response.headers.get('content-type') ?? ''
		if (contentType.includes('svg') || buffer.toString('utf8', 0, 200).includes('<svg')) {
			return { kind: 'svg', text: normalizeSvgBuffer(buffer) }
		}
		if (contentType.includes('image/png') || contentType.includes('jpeg') || contentType.includes('jpg')) {
			const ext = contentType.includes('png') ? 'png' : 'jpg'
			return { kind: ext, buffer }
		}
		throw new Error(`unsupported type ${contentType}`)
	}
	throw new Error(`rate limited ${fetchUrl}`)
}

const entities = JSON.parse(fs.readFileSync(path.join(root, `static/data/eras/${eraId}/entities.json`), 'utf8'))
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'))

const ids = entities
	.map((e) => e.id)
	.filter((id) => {
		if (!sources[id]) return false
		if (targetIds) return targetIds.has(id)
		if (onlyBroken) {
			for (const ext of ['svg', 'png', 'jpg']) {
				if (fileIssues(path.join(flagsDir, `${id}.${ext}`)).length) return true
			}
			return false
		}
		return true
	})

console.log(`Refetching ${ids.length} flags for ${eraId}...`)

let ok = 0
for (const id of ids) {
	const source = sources[id]
	const key = sourceKey(source)
	const cache = cachePath(key)
	try {
		await delay(FETCH_DELAY_MS)
		if (fs.existsSync(cache)) fs.unlinkSync(cache)
		const payload = await fetchPayload(source)
		fs.writeFileSync(cache, payload.text ?? '')
		const ext = payload.kind === 'svg' ? 'svg' : payload.kind
		const out = path.join(flagsDir, `${id}.${ext}`)
		if (payload.kind === 'svg') fs.writeFileSync(out, payload.text)
		else fs.writeFileSync(out, payload.buffer)
		console.log('OK', id, ext, payload.kind === 'svg' ? payload.text.length : payload.buffer.length)
		ok++
	} catch (error) {
		console.log('FAIL', id, error.message)
	}
}

console.log(`Refetched ${ok}/${ids.length}`)
