import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { LOCALE_STORAGE_KEY } from '@i18n/constants'

const CANDIDATE_PORTS = [5174, 5173, 4173]

async function resolveBaseUrl(browser: Browser): Promise<string | null> {
	for (const port of CANDIDATE_PORTS) {
		const url = `http://localhost:${port}`
		const page = await browser.newPage()
		try {
			await page.goto(`${url}/play?era=preww1&timer=0&lives=0`, { timeout: 8_000 })
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

async function waitForMap(page: Page) {
	await page.waitForSelector('.maplibregl-canvas', { timeout: 15_000 })
	await page.waitForFunction(
		() => document.querySelectorAll('.leaflet-tile').length === 0,
		{ timeout: 5_000 }
	)
	await page.waitForFunction(
		() =>
			document.querySelector('[data-testid="play-state"]')?.getAttribute('data-status') ===
			'playing',
		{ timeout: 30_000 }
	)
}

describe('preww1 map display', () => {
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
		'loads preww1 play map with era styling and expected entity count',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await page.addInitScript((localeKey) => {
					localStorage.setItem(localeKey, 'en')
				}, LOCALE_STORAGE_KEY)
				await page.goto(`${baseUrl}/play?era=preww1&timer=0&lives=0`)
				await waitForMap(page)
				await page.waitForFunction(
					() =>
						document.querySelector('[data-testid="play-state"]')?.getAttribute('data-era-id') ===
						'preww1',
					{ timeout: 30_000 }
				)
				await page.waitForFunction(
					() =>
						document.querySelector('[data-testid="map-shell"]')?.getAttribute('data-map-era') ===
						'preww1',
					{ timeout: 30_000 }
				)

				const state = await page.evaluate(() => {
					const mapShell = document.querySelector('[data-testid="map-shell"]')
					const playState = document.querySelector('[data-testid="play-state"]')
					return {
						hasCanvas: !!document.querySelector('.maplibregl-canvas'),
						mapEra: mapShell?.getAttribute('data-map-era') ?? null,
						eraId: playState?.getAttribute('data-era-id') ?? null,
						correct: playState?.getAttribute('data-correct') ?? null,
						total: playState?.getAttribute('data-total') ?? null
					}
				})

				expect(state.hasCanvas).toBe(true)
				expect(state.mapEra).toBe('preww1')
				expect(state.eraId).toBe('preww1')
				expect(state.correct).toBe('0')
				expect(Number(state.total)).toBeGreaterThan(100)
			} finally {
				await page.close()
			}
		},
		45_000
	)
})

describe('ce100 map display', () => {
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
		'loads ce100 play map with era styling and expected entity count',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await page.addInitScript((localeKey) => {
					localStorage.setItem(localeKey, 'en')
				}, LOCALE_STORAGE_KEY)
				await page.goto(`${baseUrl}/play?era=ce100&timer=0&lives=0`)
				await waitForMap(page)
				await page.waitForFunction(
					() =>
						document.querySelector('[data-testid="play-state"]')?.getAttribute('data-era-id') ===
						'ce100',
					{ timeout: 30_000 }
				)

				const state = await page.evaluate(() => {
					const playState = document.querySelector('[data-testid="play-state"]')
					return {
						eraId: playState?.getAttribute('data-era-id') ?? null,
						total: playState?.getAttribute('data-total') ?? null
					}
				})

				expect(state.eraId).toBe('ce100')
				expect(Number(state.total)).toBe(34)
			} finally {
				await page.close()
			}
		},
		45_000
	)
})

describe('ce1300 map display', () => {
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
		'loads ce1300 play map with era styling and expected entity count',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await page.addInitScript((localeKey) => {
					localStorage.setItem(localeKey, 'en')
				}, LOCALE_STORAGE_KEY)
				await page.goto(`${baseUrl}/play?era=ce1300&timer=0&lives=0`)
				await waitForMap(page)
				await page.waitForFunction(
					() =>
						document.querySelector('[data-testid="play-state"]')?.getAttribute('data-era-id') ===
						'ce1300',
					{ timeout: 30_000 }
				)

				const state = await page.evaluate(() => {
					const playState = document.querySelector('[data-testid="play-state"]')
					return {
						eraId: playState?.getAttribute('data-era-id') ?? null,
						total: playState?.getAttribute('data-total') ?? null
					}
				})

				expect(state.eraId).toBe('ce1300')
				expect(Number(state.total)).toBe(73)
			} finally {
				await page.close()
			}
		},
		45_000
	)
})
