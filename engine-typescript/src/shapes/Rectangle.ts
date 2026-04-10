import { Vector2 } from "@/Vector2"
import { Polygon } from "./Polygon"

/**
 * Represents an axis-aligned rectangle shape centered at a position.
 *
 * The rectangle is stored as a polygon of four corner vertices, and can
 * compute rotational inertia for rigid body dynamics.
 */
class Rectangle extends Polygon {
	private width: number
	private height: number

	/**
	 * Create a new rectangle centered at the given position.
	 *
	 * @param position - Center point of the rectangle.
	 * @param width - Horizontal size of the rectangle.
	 * @param height - Vertical size of the rectangle.
	 */
	constructor(position: Vector2, width: number, height: number) {
		super([
			// Top left corner
			new Vector2(position.x - width / 2, position.y - height / 2),

			// Top right corner
			new Vector2(position.x + width / 2, position.y - height / 2),

			// Bottom right corner
			new Vector2(position.x + width / 2, position.y + height / 2),

			// Bottom left corner
			new Vector2(position.x - width / 2, position.y + height / 2),
		])

		this.width = width
		this.height = height
	}

	/**
	 * Compute the rectangle's moment of inertia about its center.
	 *
	 * Uses the standard formula for a solid rectangle rotating around its
	 * center of mass.
	 *
	 * @param mass - Mass of the rigid body.
	 * @returns Rotational inertia for the rectangle.
	 */
	calculateInertia(mass: number): number {
		return (mass * (this.width * this.width + this.height * this.height)) / 12
	}
}

export { Rectangle }
