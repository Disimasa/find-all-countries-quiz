import type { GameConfig } from '@domain/entities'
import type { GameSettings } from '@persist'

import { buildLobbyShareHref } from '../game_settings_url.ts'

export function gameConfigToSettings(eraId: string, config: GameConfig): GameSettings {
	return {
		eraId,
		timerEnabled: config.timerEnabled,
		livesEnabled: config.livesEnabled,
		timerMinutes: Math.round(config.timerSeconds / 60),
		maxLives: config.maxLives
	}
}

export function buildLobbyShareUrl(origin: string, eraId: string, config: GameConfig): string {
	return new URL(buildLobbyShareHref(gameConfigToSettings(eraId, config)), origin).href
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}

export async function copyShareLink(url: string): Promise<boolean> {
	if (await copyTextToClipboard(url)) return true

	try {
		if (navigator.share) {
			await navigator.share({ url })
			return true
		}
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') return false
	}

	return false
}
