export const TYPING_CHAR_MS = 58
export const TYPING_CURSOR_PAUSE_MS = 420
export const DOTS_STEP_MS = 450
export const BUBBLE_EXIT_MS = 300
export const BUBBLE_ENTER_MS = 480

export const DOTS_FRAMES = ['.', '..', '...'] as const

export type PinPhase = 'idle' | 'entering' | 'visible' | 'leaving'

export function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	)
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function waitPinAnimation(
	el: HTMLElement,
	type: 'enter' | 'exit',
	reducedMotion = prefersReducedMotion()
): Promise<void> {
	if (reducedMotion) return Promise.resolve()

	const name = type === 'enter' ? 'bubble-in' : 'bubble-out'
	return new Promise((resolve) => {
		const onEnd = (event: AnimationEvent) => {
			if (event.animationName !== name) return
			el.removeEventListener('animationend', onEnd)
			resolve()
		}
		el.addEventListener('animationend', onEnd)
	})
}
