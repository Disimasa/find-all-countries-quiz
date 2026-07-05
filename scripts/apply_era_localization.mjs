import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import countries from 'i18n-iso-countries'
import ruLocale from 'i18n-iso-countries/langs/ru.json' with { type: 'json' }

countries.registerLocale(ruLocale)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const eraId = process.argv.find((arg) => arg.startsWith('--era='))?.split('=')[1] ?? 'preww1'
const dataDir = path.join(root, 'static/data/eras', eraId)
const manualRuPath = path.join(root, 'scripts/era-mappings', `${eraId}_names.ru.json`)
const manualEnPath = path.join(root, 'scripts/era-mappings', `${eraId}_names.en.json`)
const aliasesRuPath = path.join(root, 'scripts/era-mappings', `${eraId}_aliases.ru.json`)
const aliasesEnPath = path.join(root, 'scripts/era-mappings', `${eraId}_aliases.en.json`)

const RU_MANUAL_DEFAULTS = {
	'germany-prussia': 'Германская империя',
	'austria-hungary': 'Австро-Венгрия',
	'russia-soviet-union': 'Российская империя',
	'turkey-ottoman-empire': 'Османская империя',
	'qing-china': 'Китай',
	persia: 'Персия',
	'korea-empire': 'Корейская империя',
	'british-india': 'Британская Индия',
	'dutch-east-indies': 'Голландская Ост-Индия',
	'french-indochina': 'Французский Индокитай',
	'french-algeria': 'Французский Алжир',
	'french-morocco': 'Французское Марокко',
	'french-tunisia': 'Французский Тунис',
	'union-of-south-africa': 'Южно-Африканский Союз',
	'united-kingdom': 'Великобритания',
	'united-states': 'Соединённые Штаты Америки',
	egypt: 'Египет',
	canada: 'Канада',
	australia: 'Австралия',
	france: 'Франция',
	italy: 'Италия',
	spain: 'Испания',
	portugal: 'Португалия',
	netherlands: 'Нидерланды',
	belgium: 'Бельгия',
	sweden: 'Швеция',
	norway: 'Норвегия',
	denmark: 'Дания',
	switzerland: 'Швейцария',
	greece: 'Греция',
	romania: 'Румыния',
	bulgaria: 'Болгария',
	serbia: 'Сербия',
	japan: 'Япония',
	brazil: 'Бразилия',
	argentina: 'Аргентина',
	chile: 'Чили',
	mexico: 'Мексика',
	poland: 'Польша',
	finland: 'Финляндия',
	iceland: 'Исландия',
	afghanistan: 'Афганистан',
	ethiopia: 'Эфиопия',
	morocco: 'Марокко',
	turkey: 'Турция'
}

const EN_MANUAL_DEFAULTS = {
	'germany-prussia': 'German Empire',
	'austria-hungary': 'Austria-Hungary',
	'russia-soviet-union': 'Russian Empire',
	'turkey-ottoman-empire': 'Ottoman Empire',
	'qing-china': 'China',
	persia: 'Persia',
	'korea-empire': 'Korean Empire',
	'british-india': 'British India',
	'dutch-east-indies': 'Dutch East Indies',
	'vietnam-annam-cochin-china-tonkin': 'French Indochina',
	'french-algeria': 'French Algeria',
	'french-morocco': 'French Morocco',
	'french-tunisia': 'French Tunisia',
	'union-of-south-africa': 'Union of South Africa',
	'united-kingdom': 'United Kingdom',
	'united-states': 'United States of America',
	italy: 'Italy',
	romania: 'Romania',
	thailand: 'Siam'
}

const manualRu = {
	...RU_MANUAL_DEFAULTS,
	...(fs.existsSync(manualRuPath) ? JSON.parse(fs.readFileSync(manualRuPath, 'utf8')) : {})
}

const manualEn = {
	...EN_MANUAL_DEFAULTS,
	...(fs.existsSync(manualEnPath) ? JSON.parse(fs.readFileSync(manualEnPath, 'utf8')) : {})
}

const extraAliasesRu = fs.existsSync(aliasesRuPath)
	? JSON.parse(fs.readFileSync(aliasesRuPath, 'utf8'))
	: {}

const extraAliasesEn = fs.existsSync(aliasesEnPath)
	? JSON.parse(fs.readFileSync(aliasesEnPath, 'utf8'))
	: {}

const entities = JSON.parse(fs.readFileSync(path.join(dataDir, 'entities.json'), 'utf8'))
const aliasesRu = JSON.parse(fs.readFileSync(path.join(dataDir, 'aliases.ru.json'), 'utf8'))
const aliasesEn = JSON.parse(fs.readFileSync(path.join(dataDir, 'aliases.en.json'), 'utf8'))
const boundariesPath = path.join(dataDir, 'boundaries.geojson')
const boundaries = JSON.parse(fs.readFileSync(boundariesPath, 'utf8'))

const nameEnById = new Map()

for (const entity of entities) {
	const enName = manualEn[entity.id] ?? entity.nameEn
	const ruName =
		manualRu[entity.id] ??
		(entity.flagCode ? countries.getName(entity.flagCode, 'ru') : null) ??
		enName

	entity.nameEn = enName
	entity.nameRu = ruName
	nameEnById.set(entity.id, enName)

	aliasesEn[entity.id] = [...new Set([enName, ...(extraAliasesEn[entity.id] ?? [])])]
	aliasesRu[entity.id] = [...new Set([ruName, ...(extraAliasesRu[entity.id] ?? [])])]
}

for (const feature of boundaries.features) {
	const entityId = feature.properties?.entity_id
	if (!entityId) continue
	const nameEn = nameEnById.get(entityId)
	if (!nameEn) continue
	feature.properties.name_en = nameEn
}

fs.writeFileSync(path.join(dataDir, 'entities.json'), JSON.stringify(entities, null, 2))
fs.writeFileSync(path.join(dataDir, 'aliases.en.json'), JSON.stringify(aliasesEn, null, 2))
fs.writeFileSync(path.join(dataDir, 'aliases.ru.json'), JSON.stringify(aliasesRu, null, 2))
fs.writeFileSync(boundariesPath, JSON.stringify(boundaries))
console.log(`Localized ${entities.length} entities for ${eraId}`)
