import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((a) => a.startsWith('--era='))?.split('=')[1] ?? 'ce1279'
const flagsDir = path.join(root, 'static/flags/eras', eraId)
const entities = JSON.parse(
	fs.readFileSync(path.join(root, `static/data/eras/${eraId}/entities.json`), 'utf8')
)
const sources = JSON.parse(
	fs.readFileSync(path.join(root, `scripts/era-mappings/${eraId}_flag_sources.json`), 'utf8')
)

const manifest = []
for (const entity of entities) {
	const source = sources[entity.id]
	if (!source) continue
	for (const ext of ['svg', 'png', 'jpg']) {
		const file = `${entity.id}.${ext}`
		const full = path.join(flagsDir, file)
		if (fs.existsSync(full) && fs.statSync(full).size > 100) {
			const key =
				source.type === 'iso'
					? `iso:${source.code}`
					: source.type === 'timemap'
						? `timemap:${source.file}`
						: source.url
			manifest.push({ entityId: entity.id, file, source: key })
			break
		}
	}
}

const fetchedIds = new Set(manifest.map((m) => m.entityId))
const skippedIds = entities.map((e) => e.id).filter((id) => !fetchedIds.has(id))

fs.writeFileSync(path.join(flagsDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(
	path.join(flagsDir, 'coverage.json'),
	JSON.stringify(
		{ total: entities.length, fetched: manifest.length, skipped: skippedIds.length, skippedIds },
		null,
		2
	)
)

console.log(`Manifest: ${manifest.length}/${entities.length}`)
if (skippedIds.length) console.log('Missing:', skippedIds.join(', '))
