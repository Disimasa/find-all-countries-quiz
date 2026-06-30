import type { Locale } from '@domain/entities'

export const LOCALE_STORAGE_KEY = 'locale'
export const DEFAULT_LOCALE: Locale = 'en'

export const messages = {
	en: {
		title: 'Find All Countries',
		subtitle: 'Click countries on the map and name them correctly.',
		start: 'Start Quiz',
		timer: 'Timed mode (30 min)',
		lives: 'Lives (3 mistakes)',
		language: 'Language',
		loading: 'Loading map…',
		correct: 'Correct',
		remaining: 'Remaining',
		livesLabel: 'Lives',
		time: 'Time',
		progress: 'Progress',
		guessPlaceholder: 'Enter name',
		selectCountryHint: 'Click a country',
		guessTitle: 'Identify country',
		submit: 'Check',
		resetView: 'Reset view',
		endQuiz: 'End quiz',
		gameOver: 'Game Over',
		victory: 'You found them all!',
		playAgain: 'Play again',
		home: 'Home',
		wrong: 'Wrong answer',
		disclaimer:
			'Some regions are territories or disputed areas. Borders shown are for quiz purposes only.'
	},
	ru: {
		title: 'Найди все страны',
		subtitle: 'Нажимай на страны на карте и правильно называй их.',
		start: 'Начать игру',
		timer: 'На время (30 мин)',
		lives: 'Жизни (3 ошибки)',
		language: 'Язык',
		loading: 'Загрузка карты…',
		correct: 'Угадано',
		remaining: 'Осталось',
		livesLabel: 'Жизни',
		time: 'Время',
		progress: 'Прогресс',
		guessPlaceholder: 'Введите название',
		selectCountryHint: 'Нажмите на страну',
		guessTitle: 'Угадай страну',
		submit: 'Проверить',
		resetView: 'Сбросить вид',
		endQuiz: 'Завершить',
		gameOver: 'Игра окончена',
		victory: 'Вы нашли все страны!',
		playAgain: 'Играть снова',
		home: 'На главную',
		wrong: 'Неверный ответ',
		disclaimer:
			'Некоторые регионы — территории или спорные зоны. Границы показаны только для квиза.'
	}
} as const satisfies Record<Locale, Record<string, string>>
