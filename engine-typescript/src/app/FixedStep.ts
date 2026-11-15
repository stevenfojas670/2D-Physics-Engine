const DEFAULT_STEP_SECONDS = 1 / 60
const DEFAULT_MAX_STEPS_PER_FRAME = 5

class FixedStep {
	readonly stepSeconds: number
	private readonly maxStepsPerFrame: number
	private accumulatedSeconds = 0

	constructor(
		stepSeconds = DEFAULT_STEP_SECONDS,
		maxStepsPerFrame = DEFAULT_MAX_STEPS_PER_FRAME,
	) {
		this.stepSeconds = stepSeconds
		this.maxStepsPerFrame = maxStepsPerFrame
	}

	advance(frameSeconds: number): number {
		this.accumulatedSeconds += frameSeconds
		const steps = Math.floor(this.accumulatedSeconds / this.stepSeconds)
		if (steps > this.maxStepsPerFrame) {
			this.accumulatedSeconds = 0
			return this.maxStepsPerFrame
		}
		this.accumulatedSeconds -= steps * this.stepSeconds
		return steps
	}
}

export { FixedStep }
