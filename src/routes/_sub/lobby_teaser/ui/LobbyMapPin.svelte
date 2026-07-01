<script lang="ts">
	import { onDestroy, tick } from 'svelte'
	import { locale } from '@i18n'
	import { messages } from '@i18n/constants'
	import type { LobbyPinMode } from '../types.ts'
	import type { PinReplayOptions } from './lobby-pin/lobby_pin_controller.ts'
	import LobbyPinBody from './lobby-pin/LobbyPinBody.svelte'
	import { createLobbyPinController } from './lobby-pin/lobby_pin_controller.ts'
	import type { PinPhase } from './lobby-pin/constants.ts'

	export let registerReplay:
		| ((
				fn: (
					mode: LobbyPinMode,
					afterExit?: () => void | Promise<void>,
					replayOptions?: PinReplayOptions
				) => Promise<void>
		  ) => void)
		| undefined = undefined
	let mode: LobbyPinMode = 'question'
	let phase: PinPhase = 'idle'
	let typedText = ''
	let dotsText = '.'
	let pinAnimEl: HTMLDivElement | undefined

	$: typingFullText = messages[$locale].lobbyTeaserTyping
	$: showCursor = mode === 'typing' && phase !== 'leaving'

	const controller = createLobbyPinController({
		getAnimEl: () => pinAnimEl,
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

	onDestroy(() => {
		controller.destroy()
	})
</script>

<LobbyPinBody bind:pinAnimEl {mode} {phase} {typedText} {dotsText} {showCursor} />
