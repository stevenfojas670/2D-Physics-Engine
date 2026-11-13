import { Vector2, subtract } from "@/Vector2"
import { Shape } from "./Shape"
import { DrawUtils } from "@/utils/DrawUtils"

class Circle extends Shape {
	private radius: number
	private position: Vector2

	constructor(position: Vector2, radius: number) {
		super([
			new Vector2(position.x, position.y),
			new Vector2(position.x + radius, position.y),
		])
		this.position = position
		this.radius = radius
		this.setCentroid(position)
	}

	setPosition(position: Vector2): void {
		this.position = position
	}

	getRadius(): number {
		return this.radius
	}

	calculateInertia(mass: number): number {
		return mass * (this.radius * this.radius) * 0.5
	}

	calculateBoundingBox(): void {
		this.boundingBox.topLeft.x = this.position.x - this.radius
		this.boundingBox.topLeft.y = this.position.y - this.radius

		this.boundingBox.bottomRight.x = this.position.x + this.radius
		this.boundingBox.bottomRight.y = this.position.y + this.radius
	}

	isPointInside(position: Vector2): boolean {
		const distanceToCenter = subtract(this.centroid, position).lengthSquared()
		return this.radius * this.radius > distanceToCenter
	}

	draw(ctx: CanvasRenderingContext2D): void {
		super.draw(ctx)
		DrawUtils.strokePoint(this.position, this.radius, this.color)
	}
}

export { Circle }
