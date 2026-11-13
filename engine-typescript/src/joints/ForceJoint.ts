import { scale, subtract } from "@/Vector2"
import { Joint } from "./Joint"
import type { JointConnection } from "./JointConnection"

/**
 * Joint that applies a constant directional pull between two anchor points.
 */
class ForceJoint extends Joint {
	private strength: number

	/**
	 * @param connection - Anchor connection shared by the joint endpoints.
	 * @param strength - Force magnitude applied across the connection.
	 */
	constructor(connection: JointConnection, strength: number) {
		super(connection)
		this.strength = strength
	}

	/**
	 * Apply force from body A toward body B.
	 */
	updateConnectionA() {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = subtract(anchorBPos, anchorAPos)
		direction.normalize()
		this.rigA.addForceAtPoint(anchorBPos, scale(direction, this.strength * 0.5))
	}

	/**
	 * Apply force from body B toward body A.
	 */
	updateConnectionB() {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = subtract(anchorAPos, anchorBPos)
		direction.normalize()
		this.rigB.addForceAtPoint(anchorAPos, scale(direction, this.strength * 0.5))
	}
}

export { ForceJoint }
