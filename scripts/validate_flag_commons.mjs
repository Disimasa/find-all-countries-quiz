import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const curatedPath = path.join(root, 'scripts/era-mappings/preww1_flag_curated.json')
const flagIconsDir = path.join(root, 'node_modules/country-flag-icons/3x2')
const USER_AGENT = 'find-all-countries-quiz/1.0 (educational flag validation)'

const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'))
const uniqueCommons = [...new Set(Object.values(curated).filter((v) => v.startsWith('commons:')).map((v) => v.slice(8)))]

async function checkCommons(file) {
	const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${file}`
	const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
	return r.status
}

const failed = []
for (const file of uniqueCommons) {
	const status = await checkCommons(file)
	if (status !== 200) failed.push({ file, status })
	process.stdout.write(status === 200 ? '.' : 'X')
	await new Promise((r) => setTimeout(r, 800))
}
console.log(`\ncommons unique: ${uniqueCommons.length}, failed: ${failed.length}`)
for (const f of failed) console.log(f.status, f.file)

const isoFailed = []
for (const [id, value] of Object.entries(curated)) {
	if (!value.startsWith('iso:')) continue
	const code = value.slice(4)
	if (!fs.existsSync(path.join(flagIconsDir, `${code}.svg`))) isoFailed.push({ id, code })
}
console.log('iso missing:', isoFailed.length)
for (const f of isoFailed) console.log(f.id, f.code)
