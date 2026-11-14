type BatchCanvas = Pick<
	CanvasRenderingContext2D,
	| "beginPath"
	| "moveTo"
	| "lineTo"
	| "arc"
	| "stroke"
	| "fill"
	| "strokeStyle"
	| "fillStyle"
>

type BatchMap = Map<string, number[]>

const LINE_STRIDE = 4
const CIRCLE_STRIDE = 3
const ARROW_HEAD_LENGTH = 10
const ARROW_HEAD_HALF_WIDTH = 5
const FULL_TURN = Math.PI * 2

class DrawBatches {
	private readonly fills: BatchMap
	private readonly lines: BatchMap
	private readonly strokedCircles: BatchMap

	constructor() {
		this.fills = new Map()
		this.lines = new Map()
		this.strokedCircles = new Map()
	}

	line(x1: number, y1: number, x2: number, y2: number, color: string): void {
		const batch = this.batchFor(this.lines, color)
		batch.push(x1, y1, x2, y2)
	}

	rect(
		x: number,
		y: number,
		width: number,
		height: number,
		color: string,
	): void {
		const right = x + width
		const bottom = y + height
		this.line(x, y, right, y, color)
		this.line(right, y, right, bottom, color)
		this.line(right, bottom, x, bottom, color)
		this.line(x, bottom, x, y, color)
	}

	arrow(
		fromX: number,
		fromY: number,
		toX: number,
		toY: number,
		color: string,
	): void {
		this.line(fromX, fromY, toX, toY, color)
		const deltaX = toX - fromX
		const deltaY = toY - fromY
		const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
		const directionX = length > 0 ? deltaX / length : 0
		const directionY = length > 0 ? deltaY / length : 0
		const headCenterX = toX - directionX * ARROW_HEAD_LENGTH
		const headCenterY = toY - directionY * ARROW_HEAD_LENGTH
		const sideX = directionY * ARROW_HEAD_HALF_WIDTH
		const sideY = -directionX * ARROW_HEAD_HALF_WIDTH
		this.line(headCenterX + sideX, headCenterY + sideY, toX, toY, color)
		this.line(headCenterX - sideX, headCenterY - sideY, toX, toY, color)
	}

	fillCircle(x: number, y: number, radius: number, color: string): void {
		this.batchFor(this.fills, color).push(x, y, radius)
	}

	strokeCircle(x: number, y: number, radius: number, color: string): void {
		this.batchFor(this.strokedCircles, color).push(x, y, radius)
	}

	clear(): void {
		this.clearMap(this.fills)
		this.clearMap(this.lines)
		this.clearMap(this.strokedCircles)
	}

	flush(ctx: BatchCanvas): number {
		let drawCalls = 0
		for (const [color, circles] of this.fills) {
			if (circles.length === 0) {
				continue
			}
			ctx.beginPath()
			this.traceCircles(ctx, circles)
			ctx.fillStyle = color
			ctx.fill()
			drawCalls++
		}
		for (const [color, segments] of this.lines) {
			if (segments.length === 0) {
				continue
			}
			ctx.beginPath()
			for (let offset = 0; offset < segments.length; offset += LINE_STRIDE) {
				ctx.moveTo(segments[offset], segments[offset + 1])
				ctx.lineTo(segments[offset + 2], segments[offset + 3])
			}
			ctx.strokeStyle = color
			ctx.stroke()
			drawCalls++
		}
		for (const [color, circles] of this.strokedCircles) {
			if (circles.length === 0) {
				continue
			}
			ctx.beginPath()
			this.traceCircles(ctx, circles)
			ctx.strokeStyle = color
			ctx.stroke()
			drawCalls++
		}
		return drawCalls
	}

	private traceCircles(ctx: BatchCanvas, circles: number[]): void {
		for (let offset = 0; offset < circles.length; offset += CIRCLE_STRIDE) {
			const x = circles[offset]
			const y = circles[offset + 1]
			const radius = circles[offset + 2]
			ctx.moveTo(x + radius, y)
			ctx.arc(x, y, radius, 0, FULL_TURN)
		}
	}

	private batchFor(batches: BatchMap, color: string): number[] {
		let batch = batches.get(color)
		if (batch === undefined) {
			batch = []
			batches.set(color, batch)
		}
		return batch
	}

	private clearMap(batches: BatchMap): void {
		for (const batch of batches.values()) {
			batch.length = 0
		}
	}
}

export type { BatchCanvas }
export { DrawBatches }
