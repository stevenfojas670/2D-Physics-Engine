abstract class BoundingVolume {
	protected isColliding: boolean

	constructor() {
		this.isColliding = false
	}

	/**
	 * Gets whether this bounding volume is currently flagged as colliding.
	 *
	 * @returns True when the volume is marked as overlapping another volume.
	 */
	get collisionState(): boolean {
		return this.isColliding
	}

	/**
	 * Sets whether this bounding volume is currently flagged as colliding.
	 *
	 * @param isColliding - New collision-state flag.
	 */
	set collisionState(isColliding: boolean) {
		this.isColliding = isColliding
	}

	abstract intersect(otherBoundingVolume: BoundingVolume): boolean
	abstract draw(ctx: CanvasRenderingContext2D): void
}

export { BoundingVolume }
