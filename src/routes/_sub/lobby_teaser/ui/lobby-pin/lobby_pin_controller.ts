import type { LobbyPinMode } from '../../types.ts'
import {
	BUBBLE_ENTER_MS,
	BUBBLE_EXIT_MS,
	DOTS_FRAMES,
	DOTS_STEP_MS,
	delay,
	prefersReducedMotion,
	TYPING_CHAR_MS,
	TYPING_CURSOR_PAUSE_MS,
	waitPinAnimation,
	type PinPhase
} from './constants.ts'
import { runPinTransition } from './lobby_pin_transition.ts'

export type ReplayRegister = (
	mode: LobbyPinMode,
	afterExit?: () => void | Promise<void>
) => Promise<void>

export interface LobbyPinViewState {
	mode: LobbyPinMode
	phase: PinPhase
	typedText: string
	dotsText: (typeof DOTS_FRAMES)[number]
}

export function createLobbyPinController(options: {
	getBodyEl: () => HTMLDivElement | undefined
	onTick: () => Promise<void>
	onPatch: (patch: Partial<LobbyPinViewState>) => void
	getTypingText: () => string
}) {
	let typingTimer: ReturnType<typeof setTimeout> | null = null
	let dotsTimer: ReturnType<typeof setInterval> | null = null
	let phase: PinPhase = 'idle'

	function stopTypingTimer() {
		if (typingTimer) clearTimeout(typingTimer)
		typingTimer = null
	}

	function stopDotsAnimation() {
		if (dotsTimer) clearInterval(dotsTimer)
		dotsTimer = null
	}

	function clearDots() {
		stopDotsAnimation()
		options.onPatch({ dotsText: '.' })
	}

	function clearTyping() {
		stopTypingTimer()
		options.onPatch({ typedText: '' })
	}

	function startDotsAnimation() {
		stopDotsAnimation()
		if (prefersReducedMotion()) {
			options.onPatch({ dotsText: '...' })
			return
		}

		let frame = 0
		options.onPatch({ dotsText: DOTS_FRAMES[frame] })
		dotsTimer = setInterval(() => {
			frame = (frame + 1) % DOTS_FRAMES.length
			options.onPatch({ dotsText: DOTS_FRAMES[frame] })
		}, DOTS_STEP_MS)
	}

	function startTyping() {
		clearTyping()
		const fullText = options.getTypingText()

		if (prefersReducedMotion()) {
			options.onPatch({ typedText: fullText })
			return
		}

		const typeNext = (index: number) => {
			options.onPatch({ typedText: fullText.slice(0, index) })
			if (index >= fullText.length) return
			typingTimer = setTimeout(() => typeNext(index + 1), TYPING_CHAR_MS)
		}

		typingTimer = setTimeout(() => typeNext(1), TYPING_CURSOR_PAUSE_MS)
	}

	function startModeAnimations(mode: LobbyPinMode) {
		if (mode === 'typing') {
			startTyping()
		} else if (mode === 'dots') {
			startDotsAnimation()
		}
	}

	async function replay(
		nextMode: LobbyPinMode,
		afterExit?: () => void | Promise<void>
	): Promise<void> {
		stopTypingTimer()
		stopDotsAnimation()

		const bodyEl = options.getBodyEl()
		const reducedMotion = prefersReducedMotion()

		phase = await runPinTransition(phase, !!bodyEl, {
			exit: async () => {
				phase = 'leaving'
				options.onPatch({ phase })
				if (!bodyEl) return
				await Promise.race([
					waitPinAnimation(bodyEl, 'exit', reducedMotion),
					delay(BUBBLE_EXIT_MS)
				])
			},
			afterExit: async () => {
				clearTyping()
				clearDots()
				await afterExit?.()
			},
			enter: async () => {
				phase = 'entering'
				options.onPatch({ mode: nextMode, phase })
				await options.onTick()
				if (!bodyEl || reducedMotion) return
				await Promise.race([
					waitPinAnimation(bodyEl, 'enter', reducedMotion),
					delay(BUBBLE_ENTER_MS)
				])
			}
		})

		options.onPatch({ phase })
		startModeAnimations(nextMode)
	}

	function setModeImmediate(mode: LobbyPinMode) {
		options.onPatch({ mode })
	}

	function destroy() {
		clearTyping()
		clearDots()
	}

	return { replay, destroy, setModeImmediate }
}
