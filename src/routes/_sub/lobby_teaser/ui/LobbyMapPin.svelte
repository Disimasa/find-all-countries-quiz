<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte'
	import { locale } from '@i18n'
	import { messages } from '@i18n/constants'
	import type { LobbyPinMode } from '../types.ts'
	import LobbyPinBody from './lobby-pin/LobbyPinBody.svelte'
	import { createLobbyPinController } from './lobby-pin/lobby_pin_controller.ts'
	import type { PinPhase } from './lobby-pin/constants.ts'

	interface Props {
		registerReplay?: (
			fn: (
				mode: LobbyPinMode,
				afterExit?: () => void | Promise<void>
			) => Promise<void>
		) => void
	}

	let { registerReplay }: Props = $props()

	let mode = $state<LobbyPinMode>('question')
	let phase = $state<PinPhase>('idle')
	let typedText = $state('')
	let dotsText = $state('.')
	let bodyEl = $state<HTMLDivElement>()
	const typingFullText = $derived(messages[$locale].lobbyTeaserTyping)
	const showCursor = $derived(mode === 'typing' && phase !== 'leaving')

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

	onMount(() => {
		registerReplay?.(controller.replay)
	})

	onDestroy(() => {
		controller.destroy()
	})
</script>

<LobbyPinBody bind:bodyEl {mode} {phase} {typedText} {dotsText} {showCursor} />
