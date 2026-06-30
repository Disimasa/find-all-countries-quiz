import adapter from '@sveltejs/adapter-static'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: false
	},
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		alias: {
			'@domain': 'src/lib/domain',
			'@infrastructure': 'src/lib/infrastructure',
			'@shared': 'src/lib/shared',
			'@i18n': 'src/lib/i18n'
		}
	}
}

export default config
