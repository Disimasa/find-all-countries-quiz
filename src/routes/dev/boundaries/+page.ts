import { dev } from '$app/environment'
import { error } from '@sveltejs/kit'
import { MapEraRegistry } from '@domain/maps'
import type { PageLoad } from './$types'

export const prerender = false
export const ssr = false

export const load: PageLoad = () => {
	if (!dev) error(404, 'Not found')

	const eras = MapEraRegistry.listDescriptors()
		.filter((era) => era.id !== 'modern')
		.map((era) => ({ id: era.id, year: era.year }))

	return { eras }
}
