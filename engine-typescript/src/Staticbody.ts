import { CollisionGroups } from "./optimizations/CollisionGroups"
import type { Shape } from "./shapes/Shape"
import type { CollisionGroup } from "./types/collisionGroups/collisionGroups.type"

/**
 * Represents an immovable body used for static collision geometry.
 *
 * Static bodies own a collision shape and collision-group membership but are
 * not numerically integrated like dynamic rigidbodies.
 */
class StaticBody {
	private shape: Shape
	private collisionGroup: number

	/**
	 * @param shape - Collision shape owned by the static body.
	 */
	constructor(shape: Shape) {
		this.shape = shape
		this.collisionGroup = CollisionGroups.GROUP0.id
	}

	/**
	 * Assign the collision group for this static body.
	 *
	 * @param group - Collision group to apply.
	 */
	setCollisionGroup(group: CollisionGroup) {
		this.collisionGroup = group.id
	}

	/**
	 * @returns Active collision-group identifier.
	 */
	getCollisionGroup() {
		return this.collisionGroup
	}

	/**
	 * @returns Collision shape owned by this static body.
	 */
	getShape() {
		return this.shape
	}
}

export { StaticBody }
