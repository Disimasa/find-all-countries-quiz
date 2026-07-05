import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((a) => a.startsWith('--era='))?.split('=')[1] ?? 'preww1'
const curatedPath = path.join(root, 'scripts/era-mappings', `${eraId}_flag_curated.json`)
const flagIconsDir = path.join(root, 'node_modules/country-flag-icons/3x2')
const USER_AGENT = 'find-all-countries-quiz/1.0 (educational flag validation)'

const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'))
const uniqueCommons = [
	...new Set(Object.values(curated).filter((v) => v.startsWith('commons:')).map((v) => v.slice(8)))
]

async function checkCommons(file) {
	const title = encodeURIComponent(`File:${file}`)
	const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url|size&format=json`
	const r = await fetch(api, { headers: { 'User-Agent': USER_AGENT } })
	if (r.status === 429) return { file, status: 429 }
	const json = await r.json()
	const page = Object.values(json.query?.pages ?? {})[0]
	if (page?.missing) return { file, status: 404 }
	const size = page?.imageinfo?.[0]?.size
	if (!size) return { file, status: 'no-file' }
	return { file, status: 200, size }
}

const failed = []
for (const file of uniqueCommons) {
	const result = await checkCommons(file)
	if (result.status !== 200) failed.push(result)
	process.stdout.write(result.status === 200 ? '.' : 'X')
	await new Promise((r) => setTimeout(r, 2800))
}
console.log(`\ncommons unique: ${uniqueCommons.length}, failed: ${failed.length}`)
for (const f of failed) console.log(f.status, f.file)

const timemapFailed = []
for (const [id, value] of Object.entries(curated)) {
	if (!value.startsWith('timemap:')) continue
	const file = value.slice(8)
	const r = await fetch(`https://images.timemap.org/s/${file}`, {
		headers: { 'User-Agent': USER_AGENT }
	})
	if (!r.ok) timemapFailed.push({ id, file, status: r.status })
}
console.log('timemap failed:', timemapFailed.length)
for (const f of timemapFailed) console.log(f.id, f.status, f.file)

const isoFailed = []
for (const [id, value] of Object.entries(curated)) {
	if (!value.startsWith('iso:')) continue
	const code = value.slice(4)
	if (!fs.existsSync(path.join(flagIconsDir, `${code}.svg`))) isoFailed.push({ id, code })
}
console.log('iso missing:', isoFailed.length)
