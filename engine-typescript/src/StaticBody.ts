import { CollisionGroups } from "@/optimizations/CollisionGroups"
import type { Shape } from "@/shapes/Shape"
import type { CollisionGroup } from "@/types/collisionGroups/collisionGroups.types"

class StaticBody {
	private shape: Shape
	private collisionGroup: number

	constructor(shape: Shape) {
		this.shape = shape
		this.collisionGroup = CollisionGroups.GROUP0.id
	}

	setCollisionGroup(group: CollisionGroup) {
		this.collisionGroup = group.id
	}

	getCollisionGroup() {
		return this.collisionGroup
	}

	getShape() {
		return this.shape
	}
}

export { StaticBody }
