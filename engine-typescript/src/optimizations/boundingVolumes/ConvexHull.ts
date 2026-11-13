import { BoundingVolume } from "./BoundingVolume"

class ConvexHull extends BoundingVolume {
	constructor() {
		super()
	}

	intersect(otherBoundingVolume: BoundingVolume): boolean {
		void otherBoundingVolume
		return false
	}

	draw(ctx: CanvasRenderingContext2D): void {
		void ctx
	}
}

export { ConvexHull }
