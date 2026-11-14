interface FrameSummary {
	updateMs: number
	renderMs: number
	drawCalls: number
}

class FrameTimer {
	private readonly warmupFrames: number
	private readonly sampleFrames: number
	private recordedFrames: number
	private updateTotal: number
	private renderTotal: number
	private drawCallTotal: number

	constructor(warmupFrames = 60, sampleFrames = 300) {
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
		if (!this.ready) {
			return null
		}
		return {
			updateMs: this.updateTotal / this.sampleFrames,
			renderMs: this.renderTotal / this.sampleFrames,
			drawCalls: this.drawCallTotal / this.sampleFrames,
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
	}
}

export type { FrameSummary }
export { FrameTimer }
