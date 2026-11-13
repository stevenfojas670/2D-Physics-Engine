abstract class BoundingVolume {
	protected isColliding: boolean

	constructor() {
		this.isColliding = false
	}

	get collisionState(): boolean {
		return this.isColliding
	}

	set collisionState(isColliding: boolean) {
		this.isColliding = isColliding
	}

	abstract intersect(otherBoundingVolume: BoundingVolume): boolean
	abstract draw(ctx: CanvasRenderingContext2D): void
}

export { BoundingVolume }
