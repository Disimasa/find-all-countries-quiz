import type { Locale } from '@domain/entities'

export interface SiteMeta {
	title: string
	description: string
	keywords: string
}

export const siteMeta: Record<Locale, SiteMeta> = {
	en: {
		title: 'Find All Countries — World Map Quiz',
		description:
			'Click countries on an interactive world map and name them correctly. Timed mode, lives, and progress saved in your browser.',
		keywords:
			'geography quiz, world map, countries quiz, learn countries, map game, find all countries'
	},
	ru: {
		title: 'Найди все страны — квиз по карте мира',
		description:
			'Нажимай на страны на интерактивной карте мира и правильно называй их. Режим на время, жизни и сохранение прогресса в браузере.',
		keywords:
			'география, квиз, карта мира, страны, угадай страну, найди все страны'
	}
}

export const siteName = 'Find All Countries'
