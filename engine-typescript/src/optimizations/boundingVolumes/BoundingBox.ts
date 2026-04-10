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
		let leftX = this.topLeft.x
		let rightX = this.bottomRight.x
		let topY = this.topLeft.y
		let bottomY = this.bottomRight.y

		let otherLeftX = otherBoundingBox.topLeft.x
		let otherRightX = otherBoundingBox.bottomRight.x
		let otherTopY = otherBoundingBox.topLeft.y
		let otherBottomY = otherBoundingBox.bottomRight.y

		let intersectX = otherRightX > leftX && otherLeftX < rightX
		let intersectY = otherTopY < bottomY && otherBottomY > topY

		return intersectX && intersectY
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.beginPath()
		if (this.isColliding) {
			ctx.strokeStyle = "red"
		} else {
			ctx.strokeStyle = "gray"
		}
		let width = this.bottomRight.x - this.topLeft.x
		let height = this.bottomRight.y - this.topLeft.y
		ctx.rect(this.topLeft.x, this.topLeft.y, width, height)
		ctx.stroke()
		ctx.strokeStyle = "black"
		ctx.closePath()
	}
}

export { BoundingBox }
