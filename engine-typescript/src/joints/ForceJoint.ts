import { Scale, Sub } from "@/Vector2"
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
		let anchorAPos = this.getAnchorAPos()
		let anchorBPos = this.getAnchorBPos()

		let direction = Sub(anchorBPos, anchorAPos)
		direction.Normalize()
		this.rigA.addForceAtPoint(anchorBPos, Scale(direction, this.strength * 0.5))
	}

	/**
	 * Apply force from body B toward body A.
	 */
	updateConnectionB() {
		let anchorAPos = this.getAnchorAPos()
		let anchorBPos = this.getAnchorBPos()

		let direction = Sub(anchorAPos, anchorBPos)
		direction.Normalize()
		this.rigB.addForceAtPoint(anchorAPos, Scale(direction, this.strength * 0.5))
	}
}

export { ForceJoint }
