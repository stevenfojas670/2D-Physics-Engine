import type { SystemTimed } from "@/ecs/Schedule"
import { SystemTimer } from "./SystemTimer"
import type { SystemTime } from "./SystemTimer"

interface FrameSummary {
	updateMs: number
	renderMs: number
	drawCalls: number
	systems: SystemTime[]
}

class FrameTimer {
	readonly recordSystem: SystemTimed
	private readonly systemTimer: SystemTimer
	private readonly warmupFrames: number
	private readonly sampleFrames: number
	private recordedFrames: number
	private updateTotal: number
	private renderTotal: number
	private drawCallTotal: number

	constructor(
		systemNames: readonly string[],
		warmupFrames = 60,
		sampleFrames = 300,
	) {
		this.systemTimer = new SystemTimer(systemNames, warmupFrames, sampleFrames)
		this.recordSystem = this.systemTimer.recordSystem
		this.warmupFrames = warmupFrames
		this.sampleFrames = sampleFrames
		this.recordedFrames = 0
		this.updateTotal = 0
		this.renderTotal = 0
		this.drawCallTotal = 0
	}

	get ready(): boolean {
		return this.recordedFrames >= this.warmupFrames + this.sampleFrames
	}

	get summary(): FrameSummary | null {
		const systems = this.systemTimer.summary
		if (!this.ready || systems === null) {
			return null
		}
		return {
			updateMs: this.updateTotal / this.sampleFrames,
			renderMs: this.renderTotal / this.sampleFrames,
			drawCalls: this.drawCallTotal / this.sampleFrames,
			systems,
		}
	}

	record(updateMs: number, renderMs: number, drawCalls: number): void {
		if (this.ready) {
			return
		}
		if (this.recordedFrames >= this.warmupFrames) {
			this.updateTotal += updateMs
			this.renderTotal += renderMs
			this.drawCallTotal += drawCalls
		}
		this.recordedFrames++
		this.systemTimer.endFrame()
	}
}

export type { FrameSummary }
export { FrameTimer }
