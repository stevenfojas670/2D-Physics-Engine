import type { Vector2 } from "@/Vector2"
import { Shape } from "./Shape"

/**
 * Placeholder cone shape.
 *
 * This shape has not been implemented yet and currently exists as a stub for
 * future shape support.
 */
class Cone extends Shape {
	/**
	 * @param vertices - Vertices describing the cone approximation.
	 */
	constructor(vertices: Vector2[]) {
		super(vertices)
	}

	/**
	 * Compute the cone inertia.
	 *
	 * @param mass - Mass of the cone.
	 * @returns Placeholder inertia value until the shape is implemented.
	 */
	calculateInertia(mass: number): number {
		void mass
		return 0
	}
}

export { Cone }
