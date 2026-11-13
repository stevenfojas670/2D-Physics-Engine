import { Vector2, add, subtract, scale } from "@/Vector2"

class DrawUtils {
	static ctx: CanvasRenderingContext2D

	static init(ctx: CanvasRenderingContext2D) {
		DrawUtils.ctx = ctx
	}

	static drawPoint(position: Vector2, radius: number, color: string) {
		DrawUtils.ctx.beginPath()
		DrawUtils.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2, true)
		DrawUtils.ctx.fillStyle = color
		DrawUtils.ctx.fill()
		DrawUtils.ctx.closePath()
	}

	static strokePoint(position: Vector2, radius: number, color: string) {
		DrawUtils.ctx.beginPath()
		DrawUtils.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2, true)
		DrawUtils.ctx.strokeStyle = color
		DrawUtils.ctx.stroke()
		DrawUtils.ctx.closePath()
	}

	static drawLine(startPosition: Vector2, endPosition: Vector2, color: string) {
		DrawUtils.ctx.beginPath()
		DrawUtils.ctx.moveTo(startPosition.x, startPosition.y)
		DrawUtils.ctx.lineTo(endPosition.x, endPosition.y)
		DrawUtils.ctx.strokeStyle = color
		DrawUtils.ctx.stroke()
		DrawUtils.ctx.closePath()
	}

	static drawRect(startPosition: Vector2, size: Vector2, color: string) {
		DrawUtils.ctx.beginPath()
		DrawUtils.ctx.strokeStyle = color
		DrawUtils.ctx.rect(startPosition.x, startPosition.y, size.x, size.y)
		DrawUtils.ctx.stroke()
		DrawUtils.ctx.closePath()
	}

	static drawText(
		position: Vector2,
		size: number,
		color: string,
		text: string,
	) {
		DrawUtils.ctx.font = size + "px Arial"
		DrawUtils.ctx.fillStyle = color
		DrawUtils.ctx.fillText(text, position.x, position.y)
	}

	static drawArrow(
		startPosition: Vector2,
		arrowHeadPosition: Vector2,
		color: string,
	) {
		this.drawLine(startPosition, arrowHeadPosition, color)

		const direction = subtract(arrowHeadPosition, startPosition)
		direction.normalize()

		const arrowHeadCenter = subtract(arrowHeadPosition, scale(direction, 10))

		const directionToLeftArrowHead = direction.perpendicular()

		const leftArrowHeadPosition = add(
			arrowHeadCenter,
			scale(directionToLeftArrowHead, 5),
		)
		this.drawLine(leftArrowHeadPosition, arrowHeadPosition, color)

		const directionToRightArrowHead = scale(direction.perpendicular(), -1)
		const rightArrowHeadPosition = add(
			arrowHeadCenter,
			scale(directionToRightArrowHead, 5),
		)
		this.drawLine(rightArrowHeadPosition, arrowHeadPosition, color)
	}
}

export { DrawUtils }
