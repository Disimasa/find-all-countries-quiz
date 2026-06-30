import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { sveltekit } from '@sveltejs/kit/vite'
import Icons from 'unplugin-icons/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	plugins: [tailwindcss(), Icons({ compiler: 'svelte' }), sveltekit()],
	resolve: {
		alias: {
			'@domain': path.resolve(dir, 'src/lib/domain'),
			'@infrastructure': path.resolve(dir, 'src/lib/infrastructure'),
			'@shared': path.resolve(dir, 'src/lib/shared'),
			'@i18n': path.resolve(dir, 'src/lib/i18n'),
			'@theme': path.resolve(dir, 'src/lib/theme'),
			'@lobby-teaser': path.resolve(dir, 'src/routes/_sub/lobby_teaser'),
			'@persist': path.resolve(dir, 'src/lib/persist')
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['tests/unit/**/*.{test,spec}.ts']
				}
			},
			{
				extends: true,
				test: {
					name: 'integration',
					environment: 'node',
					include: ['tests/integration/**/*.{test,spec}.ts']
				}
			},
			{
				extends: true,
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
})
