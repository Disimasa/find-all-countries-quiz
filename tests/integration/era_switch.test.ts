import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { LOCALE_STORAGE_KEY } from '@i18n/constants'

const CANDIDATE_PORTS = [5174, 5173, 4173]

async function resolveBaseUrl(browser: Browser): Promise<string | null> {
	for (const port of CANDIDATE_PORTS) {
		const url = `http://localhost:${port}`
		const page = await browser.newPage()
		try {
			await page.goto(url, { timeout: 8_000 })
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

async function waitForLobbyMap(page: Page) {
	await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
	await page.getByRole('button', { name: 'New game' }).waitFor({ state: 'visible', timeout: 60_000 })
	await page.waitForTimeout(500)
}

async function getMapEra(page: Page): Promise<string | null> {
	return page
		.getByTestId('map-shell')
		.getAttribute('data-map-era')
		.catch(() => null)
}

describe('lobby era switch', () => {
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
		'switches map era from modern to 1914 and back',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await page.addInitScript((localeKey) => {
					localStorage.setItem(localeKey, 'en')
				}, LOCALE_STORAGE_KEY)
				await page.goto(baseUrl!)
				await waitForLobbyMap(page)

				expect(await getMapEra(page)).toBeNull()

				await page.getByTestId('era-option-preww1').click()
				await page.waitForFunction(
					() =>
						document.querySelector('[data-testid="map-shell"]')?.getAttribute('data-map-era') ===
						'preww1',
					{ timeout: 30_000 }
				)

				await page.getByTestId('era-option-modern').click()
				await page.waitForFunction(
					() => !document.querySelector('[data-testid="map-shell"]')?.hasAttribute('data-map-era'),
					{ timeout: 30_000 }
				)
			} finally {
				await page.close()
			}
		},
		60_000
	)
})
