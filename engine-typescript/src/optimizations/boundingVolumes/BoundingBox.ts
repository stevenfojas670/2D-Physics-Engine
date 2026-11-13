import { BoundingVolume } from "./BoundingVolume"
import { Vector2 } from "@/Vector2"

/**
 * @class BoundingBox
 * @classdesc Implements AABB bounding boxes using the Top Left and Bottom Right (min-max).
 * The bounding box calculations are implemented on Shape.js
 * If the bounding box needs to be drawn, you draw it from Shape.js
 * @property {} vertices - Array of shape vertices (Vector2)
 */
class BoundingBox extends BoundingVolume {
	public topLeft: Vector2
	public bottomRight: Vector2

	constructor() {
		super()
		this.topLeft = new Vector2(0, 0)
		this.bottomRight = new Vector2(0, 0)
		this.isColliding = false
	}

	/*This is used to check if the bounding box is intersecting with other bounding boxes*/
	intersect(otherBoundingBox: BoundingBox): boolean {
		const leftX = this.topLeft.x
		const rightX = this.bottomRight.x
		const topY = this.topLeft.y
		const bottomY = this.bottomRight.y

		const otherLeftX = otherBoundingBox.topLeft.x
		const otherRightX = otherBoundingBox.bottomRight.x
		const otherTopY = otherBoundingBox.topLeft.y
		const otherBottomY = otherBoundingBox.bottomRight.y

		const intersectX = otherRightX > leftX && otherLeftX < rightX
		const intersectY = otherTopY < bottomY && otherBottomY > topY

		return intersectX && intersectY
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.beginPath()
		if (this.isColliding) {
			ctx.strokeStyle = "red"
		} else {
			ctx.strokeStyle = "gray"
		}
		const width = this.bottomRight.x - this.topLeft.x
		const height = this.bottomRight.y - this.topLeft.y
		ctx.rect(this.topLeft.x, this.topLeft.y, width, height)
		ctx.stroke()
		ctx.strokeStyle = "black"
		ctx.closePath()
	}
}

export { BoundingBox }
