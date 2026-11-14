import type { SystemTimed } from "@/ecs/Schedule"

interface SystemTime {
	name: string
	milliseconds: number
	share: number
}

class SystemTimer {
	readonly recordSystem: SystemTimed
	private readonly names: readonly string[]
	private readonly totals: Float64Array
	private readonly warmupFrames: number
	private readonly sampleFrames: number
	private recordedFrames: number

	constructor(names: readonly string[], warmupFrames = 60, sampleFrames = 300) {
		this.names = [...names]
		this.totals = new Float64Array(names.length)
		this.warmupFrames = warmupFrames
		this.sampleFrames = sampleFrames
		this.recordedFrames = 0
		this.recordSystem = (systemIndex, milliseconds) => {
			if (this.sampling) {
				this.totals[systemIndex] += milliseconds
			}
		}
	}

	get ready(): boolean {
		return this.recordedFrames >= this.warmupFrames + this.sampleFrames
	}

	get summary(): SystemTime[] | null {
		if (!this.ready) {
			return null
		}
		let total = 0
		for (const systemTotal of this.totals) {
			total += systemTotal
		}
		return this.names
			.map((name, index) => ({
				name,
				milliseconds: this.totals[index] / this.sampleFrames,
				share: total > 0 ? this.totals[index] / total : 0,
			}))
			.sort((first, second) => second.milliseconds - first.milliseconds)
	}

	endFrame(): void {
		if (!this.ready) {
			this.recordedFrames++
		}
	}

	private get sampling(): boolean {
		return this.recordedFrames >= this.warmupFrames && !this.ready
	}
}

export type { SystemTime }
export { SystemTimer }
