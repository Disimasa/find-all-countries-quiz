import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright'
import {
	getPlayState,
	loadCe100EnglishAnswers,
	openPlay,
	pickRandomCountry,
	resolveBaseUrl,
	seedPlayStorage,
	submitGuess,
	waitForSelectionCleared
} from './helpers/playwright_helpers.ts'

describe('ce100 game flow', () => {
	let browser: Browser | undefined
	let baseUrl: string | null
	const answersEn = loadCe100EnglishAnswers()

	beforeAll(async () => {
		browser = await chromium.launch({ headless: true })
		baseUrl = await resolveBaseUrl(browser)
	}, 60_000)

	afterAll(async () => {
		await browser?.close()
	})

	it(
		'accepts a correct guess in the 100 AD era',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await seedPlayStorage(page, {
					timerEnabled: false,
					livesEnabled: false,
					eraId: 'ce100'
				})
				await openPlay(page, baseUrl, 'era=ce100&timer=0&lives=0')

				const initial = await getPlayState(page)
				expect(initial.status).toBe('playing')

				await pickRandomCountry(page)
				const { selectedId } = await getPlayState(page)
				expect(selectedId).toBeTruthy()

				const answer = answersEn.get(selectedId!)
				expect(answer).toBeTruthy()
				await submitGuess(page, answer!)
				await waitForSelectionCleared(page)

				const after = await getPlayState(page)
				expect(after.correct).toBe(1)
			} finally {
				await page.close()
			}
		},
		60_000
	)
})
