import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((arg) => arg.startsWith('--era='))?.split('=')[1] ?? 'ce1279'
const curatedPath = path.join(root, 'scripts/era-mappings', `${eraId}_flag_curated.json`)
const USER_AGENT = 'find-all-countries-quiz/1.0 (educational flag validation)'
const DELAY_MS = 500

const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'))
const uniqueCommons = [
	...new Set(Object.values(curated).filter((v) => v.startsWith('commons:')).map((v) => v.slice(8)))
]

async function checkCommons(file) {
	const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
	const response = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } })
	return response.status
}

const failed = []
for (const file of uniqueCommons) {
	const status = await checkCommons(file)
	if (status !== 200) failed.push({ file, status })
	process.stdout.write(status === 200 ? '.' : 'X')
	await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
}

console.log(`\n${eraId}: ${uniqueCommons.length} unique commons, failed: ${failed.length}`)
for (const item of failed) console.log(item.status, item.file)

if (failed.length) process.exitCode = 1
