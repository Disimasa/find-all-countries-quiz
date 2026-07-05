import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, type Page } from 'playwright'
import type { Locale } from '@domain/entities'
import { MODERN_ERA_ID } from '@domain/maps'
import { GAME_SAVE_STORAGE_KEY, GAME_SETTINGS_STORAGE_KEY } from '@persist/constants'
import { LOCALE_STORAGE_KEY } from '@i18n/constants'

const CANDIDATE_PORTS = [5174, 5173, 4173]

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const entitiesPath = path.join(root, 'static/data/eras/modern/entities.json')
const aliasesEnPath = path.join(root, 'static/data/eras/modern/aliases.en.json')
const preww1EntitiesPath = path.join(root, 'static/data/eras/preww1/entities.json')
const preww1AliasesEnPath = path.join(root, 'static/data/eras/preww1/aliases.en.json')
const ce100EntitiesPath = path.join(root, 'static/data/eras/ce100/entities.json')
const ce100AliasesEnPath = path.join(root, 'static/data/eras/ce100/aliases.en.json')
const ce1300EntitiesPath = path.join(root, 'static/data/eras/ce1300/entities.json')
const ce1300AliasesEnPath = path.join(root, 'static/data/eras/ce1300/aliases.en.json')

export type QuizEntity = {
	id: string
	nameEn: string
	nameRu: string
}

export type SavedGameSeed = {
	guessedIds: string[]
	livesRemaining: number
	timeRemaining: number | null
	total: number
	config: {
		timerEnabled: boolean
		timerSeconds: number
		livesEnabled: boolean
		maxLives: number
	}
}

export function loadQuizEntities(): QuizEntity[] {
	return JSON.parse(fs.readFileSync(entitiesPath, 'utf8')) as QuizEntity[]
}

export function loadPreWW1QuizEntities(): QuizEntity[] {
	return JSON.parse(fs.readFileSync(preww1EntitiesPath, 'utf8')) as QuizEntity[]
}

export function loadEnglishAnswers(): Map<string, string> {
	const aliases = JSON.parse(fs.readFileSync(aliasesEnPath, 'utf8')) as Record<string, string[]>
	const entities = loadQuizEntities()
	const answers = new Map<string, string>()
	for (const entity of entities) {
		answers.set(entity.id, aliases[entity.id]?.[0] ?? entity.nameEn)
	}
	return answers
}

export function loadPreWW1EnglishAnswers(): Map<string, string> {
	const aliases = JSON.parse(fs.readFileSync(preww1AliasesEnPath, 'utf8')) as Record<
		string,
		string[]
	>
	const entities = loadPreWW1QuizEntities()
	const answers = new Map<string, string>()
	for (const entity of entities) {
		answers.set(entity.id, aliases[entity.id]?.[0] ?? entity.nameEn)
	}
	return answers
}

export function loadCe100QuizEntities(): QuizEntity[] {
	return JSON.parse(fs.readFileSync(ce100EntitiesPath, 'utf8')) as QuizEntity[]
}

export function loadCe100EnglishAnswers(): Map<string, string> {
	const aliases = JSON.parse(fs.readFileSync(ce100AliasesEnPath, 'utf8')) as Record<
		string,
		string[]
	>
	const entities = loadCe100QuizEntities()
	const answers = new Map<string, string>()
	for (const entity of entities) {
		answers.set(entity.id, aliases[entity.id]?.[0] ?? entity.nameEn)
	}
	return answers
}

export function loadCe1300QuizEntities(): QuizEntity[] {
	return JSON.parse(fs.readFileSync(ce1300EntitiesPath, 'utf8')) as QuizEntity[]
}

export function loadCe1300EnglishAnswers(): Map<string, string> {
	const aliases = JSON.parse(fs.readFileSync(ce1300AliasesEnPath, 'utf8')) as Record<
		string,
		string[]
	>
	const entities = loadCe1300QuizEntities()
	const answers = new Map<string, string>()
	for (const entity of entities) {
		answers.set(entity.id, aliases[entity.id]?.[0] ?? entity.nameEn)
	}
	return answers
}

export async function resolveBaseUrl(browser: Browser): Promise<string | null> {
	for (const port of CANDIDATE_PORTS) {
		const url = `http://localhost:${port}`
		const page = await browser.newPage()
		try {
			await page.goto(`${url}/play?timer=0&lives=0`, { timeout: 8_000 })
			await page.waitForSelector('.maplibregl-canvas', { timeout: 15_000 })
			return url
		} catch {
			// try next port
		} finally {
			await page.close()
		}
	}
	return null
}

export async function seedPlayStorage(
	page: Page,
	settings: {
		timerEnabled: boolean
		livesEnabled: boolean
		timerMinutes?: number
		maxLives?: number
		eraId?: string
	},
	options: {
		locale?: Locale
		savedGame?: SavedGameSeed | null
	} = {}
): Promise<void> {
	const locale = options.locale ?? 'en'
	const savedGame = options.savedGame ?? null
	const eraId = settings.eraId ?? MODERN_ERA_ID

	await page.addInitScript(
		({ localeKey, settingsKey, saveKey, gameSettings, localeValue, savePayload, eraId }) => {
			localStorage.setItem(localeKey, localeValue)
			localStorage.setItem(settingsKey, JSON.stringify({ ...gameSettings, eraId }))
			if (savePayload) {
				localStorage.setItem(
					saveKey,
					JSON.stringify({
						eraId,
						config: savePayload.config,
						progress: {
							guessedIds: savePayload.guessedIds,
							livesRemaining: savePayload.livesRemaining,
							timeRemaining: savePayload.timeRemaining,
							total: savePayload.total
						},
						savedAt: Date.now()
					})
				)
			} else {
				localStorage.removeItem(saveKey)
			}
		},
		{
			localeKey: LOCALE_STORAGE_KEY,
			settingsKey: GAME_SETTINGS_STORAGE_KEY,
			saveKey: GAME_SAVE_STORAGE_KEY,
			eraId,
			localeValue: locale,
			gameSettings: {
				eraId,
				timerMinutes: settings.timerMinutes ?? 30,
				maxLives: settings.maxLives ?? 3,
				timerEnabled: settings.timerEnabled,
				livesEnabled: settings.livesEnabled
			},
			savePayload: savedGame
		}
	)
}

export async function openLobby(page: Page, baseUrl: string): Promise<void> {
	await page.goto(`${baseUrl}/`)
	await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
	await page.getByRole('button', { name: 'New game' }).waitFor({ state: 'visible', timeout: 30_000 })
}

export async function selectEraOnLobby(page: Page, eraId: string): Promise<void> {
	const option = page.getByTestId(`era-option-${eraId}`)
	await option.click()
	await page.waitForFunction(
		(id) =>
			document.querySelector(`[data-testid="era-option-${id}"]`)?.getAttribute('aria-selected') ===
			'true',
		eraId,
		{ timeout: 15_000 }
	)
}

export async function waitForLobbyMapEra(page: Page, eraId: string | null): Promise<void> {
	await page.waitForFunction(
		(expected) => {
			const shell = document.querySelector('[data-testid="map-shell"]')
			const actual = shell?.getAttribute('data-map-era') ?? null
			return actual === expected
		},
		eraId,
		{ timeout: 30_000 }
	)
}

export async function waitForPlaying(page: Page): Promise<void> {
	await page.getByTestId('play-state').waitFor({ state: 'attached', timeout: 30_000 })
	await page.waitForFunction(
		() =>
			document.querySelector('[data-testid="play-state"]')?.getAttribute('data-status') ===
			'playing',
		{ timeout: 30_000 }
	)
}

export async function openPlay(
	page: Page,
	baseUrl: string,
	query = 'timer=0&lives=0'
): Promise<void> {
	await page.goto(`${baseUrl}/play?${query}`)
	await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
	await waitForPlaying(page)
}

export async function getPlayState(page: Page): Promise<{
	status: string | null
	selectedId: string | null
	correct: number
	lives: number
	maxLives: number
	livesEnabled: boolean
}> {
	const state = page.getByTestId('play-state')
	return {
		status: await state.getAttribute('data-status'),
		selectedId: await state.getAttribute('data-selected-id'),
		correct: Number((await state.getAttribute('data-correct')) ?? '0'),
		lives: Number((await state.getAttribute('data-lives')) ?? '0'),
		maxLives: Number((await state.getAttribute('data-max-lives')) ?? '0'),
		livesEnabled: (await state.getAttribute('data-lives-enabled')) === 'true'
	}
}

export async function pickRandomCountry(page: Page): Promise<void> {
	await page.getByTestId('random-country').click()
	await page.getByTestId('guess-input').waitFor({ state: 'visible', timeout: 10_000 })
	await page.waitForFunction(
		() => !!document.querySelector('[data-testid="play-state"]')?.getAttribute('data-selected-id'),
		{ timeout: 10_000 }
	)
}

export async function submitGuess(page: Page, text: string): Promise<void> {
	const input = page.getByTestId('guess-input')
	await input.fill(text)
	const option = page.getByRole('option', { name: text, exact: true })
	if (await option.isVisible()) {
		await option.click()
		return
	}
	await input.press('Enter')
}

export async function waitForSelectionCleared(page: Page): Promise<void> {
	await page.waitForFunction(
		() => !document.querySelector('[data-testid="play-state"]')?.getAttribute('data-selected-id'),
		{ timeout: 10_000 }
	)
}

export async function waitForGameOver(page: Page, outcome: 'won' | 'lost'): Promise<void> {
	const modal = page.getByTestId('game-over-modal')
	await modal.waitFor({ state: 'visible', timeout: 30_000 })
	await page.waitForFunction(
		(expected) =>
			document.querySelector('[data-testid="game-over-modal"]')?.getAttribute('data-outcome') ===
			expected,
		outcome,
		{ timeout: 5_000 }
	)
}

export async function isGameOverVisible(page: Page): Promise<boolean> {
	return page.getByTestId('game-over-modal').isVisible()
}
