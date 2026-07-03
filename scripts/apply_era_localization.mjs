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
const manualPath = path.join(root, 'scripts/era-mappings', `${eraId}_names.ru.json`)
const aliasesPath = path.join(root, 'scripts/era-mappings', `${eraId}_aliases.ru.json`)

const MANUAL_DEFAULTS = {
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

const manual = {
	...MANUAL_DEFAULTS,
	...(fs.existsSync(manualPath) ? JSON.parse(fs.readFileSync(manualPath, 'utf8')) : {})
}

const extraAliases = fs.existsSync(aliasesPath)
	? JSON.parse(fs.readFileSync(aliasesPath, 'utf8'))
	: {}

const entities = JSON.parse(fs.readFileSync(path.join(dataDir, 'entities.json'), 'utf8'))
const aliasesRu = JSON.parse(fs.readFileSync(path.join(dataDir, 'aliases.ru.json'), 'utf8'))

for (const entity of entities) {
	const ruName =
		manual[entity.id] ??
		(entity.flagCode ? countries.getName(entity.flagCode, 'ru') : null) ??
		entity.nameEn
	entity.nameRu = ruName
	const extras = extraAliases[entity.id] ?? []
	aliasesRu[entity.id] = [...new Set([ruName, ...extras])]
}

fs.writeFileSync(path.join(dataDir, 'entities.json'), JSON.stringify(entities, null, 2))
fs.writeFileSync(path.join(dataDir, 'aliases.ru.json'), JSON.stringify(aliasesRu, null, 2))
console.log(`Localized ${entities.length} entities for ${eraId}`)
