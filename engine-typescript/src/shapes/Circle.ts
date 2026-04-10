import { Vector2, Sub } from "@/Vector2"
import { Shape } from "./Shape"
import { DrawUtils } from "@/utils/DrawUtils"

/**
 * A circle shape used by the physics engine.
 *
 * This class stores the circle center and radius, and exposes methods for
 * inertia calculation, containment tests, bounding box updates, and drawing.
 */
class Circle extends Shape {
	private radius: number
	private position: Vector2

	/**
	 * Creates a new circle centered at the given position.
	 *
	 * @param position - The center point of the circle.
	 * @param radius - The radius of the circle.
	 */
	constructor(position: Vector2, radius: number) {
		super([
			new Vector2(position.x, position.y),
			new Vector2(position.x + radius, position.y),
		])
		this.position = position
		this.radius = radius
		this.setCentroid(position)
	}

	/**
	 * Update the circle center position.
	 *
	 * @param position - New center position.
	 */
	setPosition(position: Vector2): void {
		this.position = position
	}

	/**
	 * Get the circle radius.
	 */
	getRadius(): number {
		return this.radius
	}

	/**
	 * Compute the moment of inertia for a solid circle about its center.
	 *
	 * @param mass - The mass of the circle.
	 * @returns The rotational inertia.
	 */
	calculateInertia(mass: number): number {
		return mass * (this.radius * this.radius) * 0.5
	}

	/**
	 * Recompute the axis-aligned bounding box for the current circle.
	 */
	calculateBoundingBox(): void {
		this.boundingBox.topLeft.x = this.position.x - this.radius
		this.boundingBox.topLeft.y = this.position.y - this.radius

		this.boundingBox.bottomRight.x = this.position.x + this.radius
		this.boundingBox.bottomRight.y = this.position.y + this.radius
	}

	/**
	 * Determine whether a given point lies inside the circle.
	 *
	 * @param position - The point to test.
	 * @returns True if the point is inside the circle.
	 */
	isPointInside(position: Vector2): boolean {
		let distanceToCenter = Sub(this.centroid, position).Length2()
		return this.radius * this.radius > distanceToCenter
	}

	/**
	 * Draw the circle on a canvas context.
	 *
	 * @param ctx - The canvas rendering context used for drawing.
	 */
	draw(ctx: CanvasRenderingContext2D): void {
		super.draw(ctx)
		DrawUtils.strokePoint(this.position, this.radius, this.color)
	}
}

export { Circle }
