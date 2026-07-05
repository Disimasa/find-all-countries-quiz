import { replaceState } from '$app/navigation'

const ROUTER_NOT_READY = 'router is initialized'

export async function safeReplaceState(
	href: string,
	state: Record<string, unknown> = {}
): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			replaceState(href, state)
			return
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			if (!message.includes(ROUTER_NOT_READY)) throw error
			await new Promise((resolve) => setTimeout(resolve, 0))
		}
	}

	throw new Error('SvelteKit router did not become ready in time')
}
