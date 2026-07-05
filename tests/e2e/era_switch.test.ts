import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright'
import {
	openLobby,
	resolveBaseUrl,
	seedPlayStorage,
	selectEraOnLobby,
	waitForLobbyMapEra
} from './helpers/playwright_helpers.ts'

describe('era switch on lobby', () => {
	let browser: Browser | undefined
	let baseUrl: string | null

	beforeAll(async () => {
		browser = await chromium.launch({ headless: true })
		baseUrl = await resolveBaseUrl(browser)
	}, 60_000)

	afterAll(async () => {
		await browser?.close()
	})

	it(
		'switches between modern, 1914, 100 AD, and 1300 maps on the lobby',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await seedPlayStorage(page, {
					timerEnabled: false,
					livesEnabled: false,
					eraId: 'modern'
				})
				await openLobby(page, baseUrl)
				await waitForLobbyMapEra(page, null)

				await selectEraOnLobby(page, 'ce100')
				await waitForLobbyMapEra(page, 'ce100')

				await selectEraOnLobby(page, 'ce1300')
				await waitForLobbyMapEra(page, 'ce1300')

				await selectEraOnLobby(page, 'preww1')
				await waitForLobbyMapEra(page, 'preww1')

				await selectEraOnLobby(page, 'modern')
				await waitForLobbyMapEra(page, null)
			} finally {
				await page.close()
			}
		},
		90_000
	)
})
