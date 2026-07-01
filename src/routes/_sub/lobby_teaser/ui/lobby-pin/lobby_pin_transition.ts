export type PinPhase = 'idle' | 'entering' | 'visible' | 'leaving'

export interface PinTransitionSteps {
	exit?: () => void | Promise<void>
	afterExit?: () => void | Promise<void>
	enter?: () => void | Promise<void>
}

export interface PinTransitionOptions {
	skipExit?: boolean
}

export async function runPinTransition(
	currentPhase: PinPhase,
	hasBody: boolean,
	steps: PinTransitionSteps,
	options?: PinTransitionOptions
): Promise<PinPhase> {
	const { phase } = await runPinTransitionWithLog(currentPhase, hasBody, steps, options)
	return phase
}

export async function runPinTransitionWithLog(
	currentPhase: PinPhase,
	hasBody: boolean,
	steps: PinTransitionSteps,
	options?: PinTransitionOptions
): Promise<{ phase: PinPhase; log: Array<'exit' | 'after-exit' | 'enter'> }> {
	const log: Array<'exit' | 'after-exit' | 'enter'> = []

	if (!options?.skipExit && currentPhase !== 'idle' && hasBody) {
		await steps.exit?.()
		log.push('exit')
	}

	await steps.afterExit?.()
	log.push('after-exit')

	await steps.enter?.()
	log.push('enter')

	return { phase: 'visible', log }
}
