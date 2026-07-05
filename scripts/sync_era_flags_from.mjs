import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const fromEra = process.argv.find((a) => a.startsWith('--from='))?.split('=')[1] ?? 'ce1279'
const toEra = process.argv.find((a) => a.startsWith('--to='))?.split('=')[1] ?? 'ce1300'

const fromCuratedPath = path.join(root, 'scripts/era-mappings', `${fromEra}_flag_curated.json`)
const toCuratedPath = path.join(root, 'scripts/era-mappings', `${toEra}_flag_curated.json`)
const fromFlagsDir = path.join(root, 'static/flags/eras', fromEra)
const toFlagsDir = path.join(root, 'static/flags/eras', toEra)
const toEntitiesPath = path.join(root, 'static/data/eras', toEra, 'entities.json')

const fromCurated = JSON.parse(fs.readFileSync(fromCuratedPath, 'utf8'))
const fromManifest = JSON.parse(fs.readFileSync(path.join(fromFlagsDir, 'manifest.json'), 'utf8'))
const toEntities = JSON.parse(fs.readFileSync(toEntitiesPath, 'utf8'))

/** ce1300-only overrides and aliases not present in ce1279 */
const extraCurated = {
	morocco: fromCurated['merinides'] ?? 'commons:Flag of Morocco.svg',
	bosnia: 'timemap:_c/Kingdom_of_Bosnia.svg',
	'galicia-volhynia': 'commons:Coat of arms of Ruthenia (Герб Русі).svg',
	moscow: 'commons:Banner of Dmitry Donskoy.svg',
	majapahit: 'commons:Naval flag of Majapahit Kingdom.svg',
	smolensk: 'commons:Flag of Smolensk Oblast.svg',
	'vladimir-suzdal': 'commons:Flag of Vladimir Oblast.svg',
	pskov: 'commons:Flag of Pskov Oblast.svg',
	florence: 'commons:Flag of Florence.svg',
	genoa: 'commons:Flag of Genoa.svg',
	'swiss-confederation': 'iso:CH',
	tver: 'commons:Flag of Tver Oblast.svg'
}

const toCurated = {}
for (const entity of toEntities) {
	if (fromCurated[entity.id]) {
		toCurated[entity.id] = fromCurated[entity.id]
	} else if (extraCurated[entity.id]) {
		toCurated[entity.id] = extraCurated[entity.id]
	}
}

fs.mkdirSync(path.dirname(toCuratedPath), { recursive: true })
fs.writeFileSync(toCuratedPath, JSON.stringify(toCurated, null, '\t') + '\n')

fs.mkdirSync(toFlagsDir, { recursive: true })

const fileByEntity = new Map(fromManifest.map((entry) => [entry.entityId, entry.file]))
let copied = 0
for (const entity of toEntities) {
	const file = fileByEntity.get(entity.id)
	if (!file) continue
	const src = path.join(fromFlagsDir, file)
	const dest = path.join(toFlagsDir, file)
	if (!fs.existsSync(src)) continue
	fs.copyFileSync(src, dest)
	const entityDest = path.join(toFlagsDir, `${entity.id}${path.extname(file)}`)
	if (entityDest !== dest) {
		fs.copyFileSync(src, entityDest)
	}
	copied++
}

console.log(`Curated ${Object.keys(toCurated).length}/${toEntities.length} for ${toEra}`)
console.log(`Copied ${copied} flag files from ${fromEra}`)

const missing = toEntities.map((e) => e.id).filter((id) => !toCurated[id])
if (missing.length) {
	console.log(`Missing curated (${missing.length}): ${missing.join(', ')}`)
	process.exitCode = 1
}
