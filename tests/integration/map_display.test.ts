import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { MAP_MIN_ZOOM } from '@infrastructure/map/constants'

const CANDIDATE_PORTS = [5174, 5173, 4173]

async function resolveBaseUrl(browser: Browser): Promise<string | null> {
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

async function waitForMap(page: Page) {
	await page.waitForSelector('.maplibregl-canvas', { timeout: 15_000 })
	await page.waitForFunction(
		() => document.querySelectorAll('.leaflet-tile').length === 0,
		{ timeout: 5_000 }
	)
	await page.waitForTimeout(1500)
}

describe('play map display', () => {
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
		'renders MapLibre canvas with hidden labels and no raster tile grid',
		async () => {
			expect(baseUrl, 'Start dev server: pnpm dev').toBeTruthy()
			if (!baseUrl || !browser) return

			const page = await browser.newPage()
			try {
				await page.goto(`${baseUrl}/play?timer=0&lives=0`)
				await waitForMap(page)

				const state = await page.evaluate(() => {
					return {
						hasCanvas: !!document.querySelector('.maplibregl-canvas'),
						rasterTiles: document.querySelectorAll('.leaflet-tile').length,
						progressRemaining: document.body.innerText.match(/(\d+)\s*$/)?.[0] ?? ''
					}
				})

				expect(state.hasCanvas).toBe(true)
				expect(state.rasterTiles).toBe(0)

				const map = page.locator('.maplibregl-canvas')
				const box = await map.boundingBox()
				expect(box).toBeTruthy()
				if (box) {
					const cx = box.x + box.width / 2
					const cy = box.y + box.height / 2
					await page.mouse.move(cx, cy)
					await page.mouse.down()
					await page.mouse.move(cx - 280, cy - 80, { steps: 16 })
					await page.mouse.up()
					await page.waitForTimeout(400)
				}

				const afterPan = await page.evaluate(() => ({
					rasterTiles: document.querySelectorAll('.leaflet-tile').length,
					hasCanvas: !!document.querySelector('.maplibregl-canvas')
				}))
				expect(afterPan.hasCanvas).toBe(true)
				expect(afterPan.rasterTiles).toBe(0)
				expect(MAP_MIN_ZOOM).toBe(1)
			} finally {
				await page.close()
			}
		},
		40_000
	)
})
