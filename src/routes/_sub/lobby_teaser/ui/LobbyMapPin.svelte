<script lang="ts">
	import { onDestroy, tick } from 'svelte'
	import { locale } from '@i18n'
	import { messages } from '@i18n/constants'
	import type { LobbyPinMode } from '../types.ts'
	import LobbyPinBody from './lobby-pin/LobbyPinBody.svelte'
	import { createLobbyPinController } from './lobby-pin/lobby_pin_controller.ts'
	import type { PinPhase } from './lobby-pin/constants.ts'

	export let registerReplay:
		| ((
				fn: (
					mode: LobbyPinMode,
					afterExit?: () => void | Promise<void>
				) => Promise<void>
		  ) => void)
		| undefined = undefined
	export let registerSetMode: ((fn: (mode: LobbyPinMode) => void) => void) | undefined = undefined

	let mode: LobbyPinMode = 'question'
	let phase: PinPhase = 'idle'
	let typedText = ''
	let dotsText = '.'
	let bodyEl: HTMLDivElement | undefined

	$: typingFullText = messages[$locale].lobbyTeaserTyping
	$: showCursor = mode === 'typing' && phase !== 'leaving'

	const controller = createLobbyPinController({
		getBodyEl: () => bodyEl,
		onTick: tick,
		getTypingText: () => typingFullText,
		onPatch(patch) {
			if (patch.mode !== undefined) mode = patch.mode
			if (patch.phase !== undefined) phase = patch.phase
			if (patch.typedText !== undefined) typedText = patch.typedText
			if (patch.dotsText !== undefined) dotsText = patch.dotsText
		}
	})

	registerReplay?.(controller.replay)
	registerSetMode?.(controller.setModeImmediate)

	onDestroy(() => {
		controller.destroy()
	})
</script>

<LobbyPinBody bind:bodyEl {mode} {phase} {typedText} {dotsText} {showCursor} />
