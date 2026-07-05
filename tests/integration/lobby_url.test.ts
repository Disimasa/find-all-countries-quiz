import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { LOCALE_STORAGE_KEY } from '@i18n/constants'
import { GAME_SETTINGS_STORAGE_KEY } from '@persist/constants'

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

async function waitForLobbyReady(page: Page) {
	await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
	await page.getByRole('button', { name: 'New game' }).waitFor({ state: 'visible', timeout: 30_000 })
}

async function getMapEra(page: Page): Promise<string | null> {
	return page.getByTestId('map-shell').getAttribute('data-map-era')
}

describe('lobby URL sync', () => {
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
		'loads bare / lobby without hanging on the loading screen',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await page.addInitScript(
					({ localeKey, settingsKey }) => {
						localStorage.setItem(localeKey, 'en')
						localStorage.removeItem(settingsKey)
					},
					{ localeKey: LOCALE_STORAGE_KEY, settingsKey: GAME_SETTINGS_STORAGE_KEY }
				)

				await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' })
				await waitForLobbyReady(page)

				expect(page.url()).toContain('timer=30')
				expect(page.url()).toContain('lives=3')
				expect(await getMapEra(page)).toBeNull()
			} finally {
				await page.close()
			}
		},
		60_000
	)

	it(
		'opens shared lobby URL with era and settings applied to the map',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await page.addInitScript((localeKey) => {
					localStorage.setItem(localeKey, 'en')
				}, LOCALE_STORAGE_KEY)

				await page.goto(`${baseUrl}/?era=ce1300&timer=60&lives=5`, {
					waitUntil: 'domcontentloaded'
				})
				await waitForLobbyReady(page)

				await page.waitForFunction(
					() =>
						document.querySelector('[data-testid="map-shell"]')?.getAttribute('data-map-era') ===
						'ce1300',
					{ timeout: 30_000 }
				)

				expect(await page.getByTestId('era-option-ce1300').getAttribute('aria-selected')).toBe(
					'true'
				)
				expect(page.url()).toContain('era=ce1300')
				expect(page.url()).toContain('timer=60')
				expect(page.url()).toContain('lives=5')
			} finally {
				await page.close()
			}
		},
		60_000
	)
})
