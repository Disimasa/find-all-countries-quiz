import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' }
import ruLocale from 'i18n-iso-countries/langs/ru.json' with { type: 'json' }

countries.registerLocale(enLocale)
countries.registerLocale(ruLocale)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const geoPath = path.join(root, 'static/data/eras/modern/boundaries.geojson')
const outDir = path.join(root, 'static/data/eras/modern')

const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'))
const entities = []
const aliasesEn = {}
const aliasesRu = {}

const extraAliasesEn = {
	US: ['USA', 'United States of America', 'America'],
	GB: ['UK', 'Great Britain', 'Britain'],
	AE: ['UAE'],
	CZ: ['Czechia'],
	CI: ['Ivory Coast'],
	CD: ['DRC', 'Congo-Kinshasa'],
	CG: ['Congo-Brazzaville'],
	KR: ['South Korea', 'Korea'],
	KP: ['North Korea'],
	LA: ['Laos'],
	MK: ['North Macedonia'],
	FM: ['Micronesia'],
	VA: ['Vatican'],
	TR: ['Turkey', 'Türkiye'],
	RU: ['Russia'],
	BO: ['Bolivia'],
	VE: ['Venezuela'],
	TZ: ['Tanzania'],
	SY: ['Syria'],
	IR: ['Iran'],
	VN: ['Vietnam', 'Viet Nam']
}

const extraAliasesRu = {
	US: ['США', 'Америка'],
	GB: ['Англия', 'Британия', 'Великобритания'],
	AE: ['ОАЭ'],
	CZ: ['Чехия'],
	CI: ['Кот-д’Ивуар'],
	CD: ['ДР Конго'],
	CG: ['Конго'],
	KR: ['Южная Корея', 'Корея'],
	KP: ['Северная Корея'],
	LA: ['Лаос'],
	MK: ['Северная Македония'],
	RU: ['Россия'],
	BO: ['Боливия'],
	VE: ['Венесуэла'],
	TZ: ['Танзания'],
	SY: ['Сирия'],
	IR: ['Иран'],
	VN: ['Вьетнам'],
	NL: ['Голландия'],
	DE: ['Германия'],
	FR: ['Франция'],
	ES: ['Испания'],
	IT: ['Италия'],
	GR: ['Греция'],
	CN: ['Китай'],
	JP: ['Япония'],
	IN: ['Индия'],
	BR: ['Бразилия'],
	UA: ['Украина'],
	BY: ['Беларусь'],
	KZ: ['Казахстан'],
	GE: ['Грузия'],
	AM: ['Армения'],
	AZ: ['Азербайджан']
}

for (const feature of geo.features) {
	const iso = feature.properties.ISO_A2
	if (!iso || iso === '-99') continue

	const nameEn = feature.properties.NAME || countries.getName(iso, 'en') || iso
	const nameRu = countries.getName(iso, 'ru') || nameEn

	entities.push({
		id: iso,
		nameEn,
		nameRu,
		region: feature.properties.REGION_UN ?? undefined,
		flagCode: iso
	})

	aliasesEn[iso] = [nameEn, ...(extraAliasesEn[iso] ?? [])]
	aliasesRu[iso] = [nameRu, ...(extraAliasesRu[iso] ?? [])]
}

fs.writeFileSync(path.join(outDir, 'entities.json'), JSON.stringify(entities, null, 2))
fs.writeFileSync(path.join(outDir, 'aliases.en.json'), JSON.stringify(aliasesEn, null, 2))
fs.writeFileSync(path.join(outDir, 'aliases.ru.json'), JSON.stringify(aliasesRu, null, 2))

console.log(`Generated ${entities.length} entities`)
