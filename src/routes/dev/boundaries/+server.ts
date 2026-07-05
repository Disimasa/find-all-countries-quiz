import { dev } from '$app/environment'
import { error, json } from '@sveltejs/kit'
import {
	latestRevisionId,
	listRevisionIds,
	saveRevision
} from '$lib/dev/boundary_editor/revision_storage'
import type { FeatureCollection } from 'geojson'
import type { RequestHandler } from './$types'

function assertDev(): void {
	if (!dev) error(404, 'Not found')
}

function sanitizeEraId(eraId: string): string {
	if (!/^[a-z0-9]+$/.test(eraId)) error(400, 'Invalid era id')
	return eraId
}

export const GET: RequestHandler = async ({ url }) => {
	assertDev()
	const eraId = sanitizeEraId(url.searchParams.get('era') ?? 'ce1300')
	const revisions = listRevisionIds(process.cwd(), eraId)
	return json({ eraId, revisions, latest: latestRevisionId(process.cwd(), eraId) })
}

export const POST: RequestHandler = async ({ request }) => {
	assertDev()
	const body = (await request.json()) as {
		eraId?: string
		collection?: FeatureCollection
	}
	const eraId = sanitizeEraId(body.eraId ?? '')
	const collection = body.collection

	if (!collection?.features?.length) error(400, 'Missing collection')

	const { revisionId, relativePath } = saveRevision(process.cwd(), eraId, collection)

	return json({ ok: true, revisionId, path: relativePath })
}
