import type { LobbyPinMode } from '../../types.ts'
import {
	BUBBLE_ENTER_MS,
	BUBBLE_ENTER_START_MS,
	BUBBLE_EXIT_MS,
	BUBBLE_EXIT_START_MS,
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

export type PinReplayOptions = {
	enterMs?: number
	exitMs?: number
	skipExit?: boolean
	enterAnimation?: string
	exitAnimation?: string
}

export function createLobbyPinController(options: {
	getAnimEl: () => HTMLDivElement | undefined
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
		afterExit?: () => void | Promise<void>,
		replayOptions?: PinReplayOptions
	): Promise<void> {
		stopTypingTimer()
		stopDotsAnimation()

		const reducedMotion = prefersReducedMotion()
		const enterMs = replayOptions?.enterMs ?? BUBBLE_ENTER_MS
		const exitMs = replayOptions?.exitMs ?? BUBBLE_EXIT_MS
		const enterAnimation = replayOptions?.enterAnimation ?? 'bubble-in'
		const exitAnimation = replayOptions?.exitAnimation ?? 'bubble-out'

		phase = await runPinTransition(
			phase,
			!!options.getAnimEl(),
			{
				exit: async () => {
					phase = 'leaving'
					options.onPatch({ phase })
					await options.onTick()
					const animEl = options.getAnimEl()
					if (!animEl || reducedMotion) return
					await Promise.race([
						waitPinAnimation(animEl, 'exit', reducedMotion, exitAnimation),
						delay(exitMs)
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
					const animEl = options.getAnimEl()
					if (!animEl || reducedMotion) return
					await Promise.race([
						waitPinAnimation(animEl, 'enter', reducedMotion, enterAnimation),
						delay(enterMs)
					])
				}
			},
			{ skipExit: replayOptions?.skipExit }
		)

		options.onPatch({ phase })
		startModeAnimations(nextMode)
	}

	function destroy() {
		clearTyping()
		clearDots()
	}

	return { replay, destroy }
}
