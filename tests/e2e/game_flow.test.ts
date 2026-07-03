import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright'
import {
	getPlayState,
	isGameOverVisible,
	loadEnglishAnswers,
	loadQuizEntities,
	openPlay,
	pickRandomCountry,
	resolveBaseUrl,
	seedPlayStorage,
	submitGuess,
	waitForGameOver,
	waitForPlaying,
	waitForSelectionCleared
} from './helpers/playwright_helpers.ts'

describe('play game flow', () => {
	let browser: Browser | undefined
	let baseUrl: string | null
	const entities = loadQuizEntities()
	const answersEn = loadEnglishAnswers()
	const namesRuById = new Map(entities.map((entity) => [entity.id, entity.nameRu]))

	beforeAll(async () => {
		browser = await chromium.launch({ headless: true })
		baseUrl = await resolveBaseUrl(browser)
	}, 60_000)

	afterAll(async () => {
		await browser?.close()
	})

	it(
		'shows game over modal after exhausting lives on a wrong guess',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await seedPlayStorage(page, {
					timerEnabled: false,
					livesEnabled: true,
					maxLives: 1
				})
				await openPlay(page, baseUrl, 'timer=0&lives=1')

				await pickRandomCountry(page)
				const { selectedId } = await getPlayState(page)
				expect(selectedId).toBeTruthy()

				const wrongName = entities.find((entity) => entity.id !== selectedId)?.nameEn
				expect(wrongName).toBeTruthy()
				await submitGuess(page, wrongName!)

				await waitForGameOver(page, 'lost')
				expect(await page.getByTestId('game-over-title').innerText()).toBe('Game Over')
				expect(await page.getByText('Out of lives').isVisible()).toBe(true)
			} finally {
				await page.close()
			}
		},
		60_000
	)

	it(
		'wins after guessing every country and shows the victory modal',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await seedPlayStorage(page, {
					timerEnabled: false,
					livesEnabled: false
				})
				await openPlay(page, baseUrl, 'timer=0&lives=0')

				const total = entities.length
				let lastCorrect = 0

				for (let attempt = 0; attempt < total + 5; attempt += 1) {
					const { status, correct } = await getPlayState(page)
					if (status === 'won') break
					expect(status).toBe('playing')
					expect(correct).toBeGreaterThanOrEqual(lastCorrect)
					lastCorrect = correct

					await pickRandomCountry(page)
					const { selectedId } = await getPlayState(page)
					expect(selectedId).toBeTruthy()

					const name = answersEn.get(selectedId!)
					expect(name).toBeTruthy()
					await submitGuess(page, name!)

					if (correct + 1 < total) {
						await waitForSelectionCleared(page)
					}
				}

				await waitForGameOver(page, 'won')
				expect(await page.getByTestId('game-over-title').innerText()).toBe('You found them all!')
				expect(await page.getByText(`Found ${total} of ${total}`).isVisible()).toBe(true)
			} finally {
				await page.close()
			}
		},
		600_000
	)

	it(
		'shows game over modal when the timer runs out',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			const total = entities.length
			try {
				await seedPlayStorage(
					page,
					{ timerEnabled: true, livesEnabled: false, timerMinutes: 5 },
					{
						savedGame: {
							guessedIds: ['DE'],
							livesRemaining: 3,
							timeRemaining: 2,
							total,
							config: {
								timerEnabled: true,
								timerSeconds: 300,
								livesEnabled: false,
								maxLives: 3
							}
						}
					}
				)
				await openPlay(page, baseUrl, 'timer=1&lives=0')

				await waitForGameOver(page, 'lost')
				expect(await page.getByTestId('game-over-title').innerText()).toBe('Game Over')
				expect(await page.getByText('Time ran out').isVisible()).toBe(true)
			} finally {
				await page.close()
			}
		},
		30_000
	)

	it(
		'keeps the guess dialog open after a wrong answer while lives remain',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await seedPlayStorage(page, {
					timerEnabled: false,
					livesEnabled: true,
					maxLives: 3
				})
				await openPlay(page, baseUrl, 'timer=0&lives=1')

				await pickRandomCountry(page)
				const before = await getPlayState(page)
				const wrongName = entities.find((entity) => entity.id !== before.selectedId)?.nameEn
				expect(wrongName).toBeTruthy()

				await submitGuess(page, wrongName!)
				const after = await getPlayState(page)

				expect(after.status).toBe('playing')
				expect(after.lives).toBe(2)
				expect(after.maxLives).toBe(3)
				expect(after.selectedId).toBe(before.selectedId)
				expect(await page.getByTestId('guess-input').isVisible()).toBe(true)
				expect(await isGameOverVisible(page)).toBe(false)
			} finally {
				await page.close()
			}
		},
		60_000
	)

	it(
		'accepts Russian names in RU locale and ignores English input',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await seedPlayStorage(
					page,
					{ timerEnabled: false, livesEnabled: false },
					{ locale: 'ru' }
				)
				await openPlay(page, baseUrl, 'timer=0&lives=0')

				await pickRandomCountry(page)
				const first = await getPlayState(page)
				const ruName = namesRuById.get(first.selectedId!)
				expect(ruName).toBeTruthy()

				await submitGuess(page, ruName!)
				await waitForSelectionCleared(page)
				expect((await getPlayState(page)).correct).toBe(1)

				await pickRandomCountry(page)
				const second = await getPlayState(page)
				const enName = answersEn.get(second.selectedId!)
				expect(enName).toBeTruthy()

				await submitGuess(page, enName!)
				const afterEnglish = await getPlayState(page)
				expect(afterEnglish.correct).toBe(1)
				expect(afterEnglish.selectedId).toBe(second.selectedId)
				expect(await page.getByTestId('guess-input').isVisible()).toBe(true)
				expect(await isGameOverVisible(page)).toBe(false)
			} finally {
				await page.close()
			}
		},
		60_000
	)

	it(
		'resumes a saved game from the lobby continue button',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			const resumeCount = 3
			try {
				await seedPlayStorage(page, {
					timerEnabled: false,
					livesEnabled: false
				})
				await openPlay(page, baseUrl, 'timer=0&lives=0')

				for (let i = 0; i < resumeCount; i += 1) {
					await pickRandomCountry(page)
					const { selectedId } = await getPlayState(page)
					const name = answersEn.get(selectedId!)
					expect(name).toBeTruthy()
					await submitGuess(page, name!)
					await waitForSelectionCleared(page)
				}

				expect((await getPlayState(page)).correct).toBe(resumeCount)

				await page.getByRole('button', { name: 'End quiz' }).click()
				const endModal = page.getByTestId('game-over-modal')
				await endModal.waitFor({ state: 'visible', timeout: 15_000 })
				expect(await page.getByTestId('game-over-title').innerText()).toBe('Quiz ended')
				expect(await endModal.getAttribute('data-outcome')).toBe('ended')
				await page.getByRole('button', { name: 'Home' }).click()
				await page.getByRole('button', { name: 'New game' }).waitFor({ state: 'visible', timeout: 15_000 })
				await page.getByTestId('continue-game').waitFor({ state: 'visible', timeout: 15_000 })
				await page.getByTestId('continue-game').click()

				await waitForPlaying(page)
				expect((await getPlayState(page)).correct).toBe(resumeCount)
			} finally {
				await page.close()
			}
		},
		90_000
	)
})
