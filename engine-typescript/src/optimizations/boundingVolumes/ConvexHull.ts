import { BoundingVolume } from "./BoundingVolume"

/**
 * Placeholder convex-hull bounding volume implementation.
 *
 * This class exists as a future extension point for tighter broad-phase or
 * debug bounds but is not yet fully implemented.
 */
class ConvexHull extends BoundingVolume {
	constructor() {
		super()
	}

	/**
	 * Test hull overlap against another bounding volume.
	 *
	 * @param otherBoundingVolume - Bounding volume to test against.
	 * @returns Always false until convex-hull intersection is implemented.
	 */
	intersect(otherBoundingVolume: BoundingVolume): boolean {
		void otherBoundingVolume
		return false
	}

	/**
	 * Draw the convex hull for debugging.
	 *
	 * @param ctx - Canvas rendering context used for drawing.
	 */
	draw(ctx: CanvasRenderingContext2D): void {
		void ctx
	}
}

export { ConvexHull }
