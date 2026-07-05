import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((arg) => arg.startsWith('--era='))?.split('=')[1]
if (!eraId) {
	console.error('Usage: node scripts/apply_era_extra_aliases.mjs --era=<eraId>')
	process.exit(1)
}

const dataDir = path.join(root, 'static/data/eras', eraId)
const mappingDir = path.join(root, 'scripts/era-mappings')
const extraEnPath = path.join(mappingDir, `${eraId}_aliases.en.json`)
const extraRuPath = path.join(mappingDir, `${eraId}_aliases.ru.json`)

const extraEn = fs.existsSync(extraEnPath) ? JSON.parse(fs.readFileSync(extraEnPath, 'utf8')) : {}
const extraRu = fs.existsSync(extraRuPath) ? JSON.parse(fs.readFileSync(extraRuPath, 'utf8')) : {}

const entities = JSON.parse(fs.readFileSync(path.join(dataDir, 'entities.json'), 'utf8'))
const aliasesEn = {}
const aliasesRu = {}

for (const entity of entities) {
	aliasesEn[entity.id] = [...new Set([entity.nameEn, ...(extraEn[entity.id] ?? [])])]
	aliasesRu[entity.id] = [...new Set([entity.nameRu, ...(extraRu[entity.id] ?? [])])]
}

fs.writeFileSync(path.join(dataDir, 'aliases.en.json'), JSON.stringify(aliasesEn, null, 2))
fs.writeFileSync(path.join(dataDir, 'aliases.ru.json'), JSON.stringify(aliasesRu, null, 2))
console.log(`Synced extra aliases for ${entities.length} entities in ${eraId}`)
