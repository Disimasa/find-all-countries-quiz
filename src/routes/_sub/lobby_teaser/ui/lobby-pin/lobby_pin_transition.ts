export type PinPhase = 'idle' | 'entering' | 'visible' | 'leaving'

export interface PinTransitionSteps {
	exit?: () => void | Promise<void>
	afterExit?: () => void | Promise<void>
	enter?: () => void | Promise<void>
}

export async function runPinTransition(
	currentPhase: PinPhase,
	hasBody: boolean,
	steps: PinTransitionSteps
): Promise<PinPhase> {
	const { phase } = await runPinTransitionWithLog(currentPhase, hasBody, steps)
	return phase
}

export async function runPinTransitionWithLog(
	currentPhase: PinPhase,
	hasBody: boolean,
	steps: PinTransitionSteps
): Promise<{ phase: PinPhase; log: Array<'exit' | 'after-exit' | 'enter'> }> {
	const log: Array<'exit' | 'after-exit' | 'enter'> = []

	if (currentPhase !== 'idle' && hasBody) {
		await steps.exit?.()
		log.push('exit')
	}

	await steps.afterExit?.()
	log.push('after-exit')

	await steps.enter?.()
	log.push('enter')

	return { phase: 'visible', log }
}
