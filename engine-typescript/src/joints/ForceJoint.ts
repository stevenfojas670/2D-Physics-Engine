import { scale, subtract } from "@/Vector2"
import { Joint } from "./Joint"
import type { JointConnection } from "./JointConnection"

class ForceJoint extends Joint {
	private strength: number

	constructor(connection: JointConnection, strength: number) {
		super(connection)
		this.strength = strength
	}

	updateConnectionA() {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = subtract(anchorBPos, anchorAPos)
		direction.normalize()
		this.rigA.addForceAtPoint(anchorBPos, scale(direction, this.strength * 0.5))
	}

	updateConnectionB() {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = subtract(anchorAPos, anchorBPos)
		direction.normalize()
		this.rigB.addForceAtPoint(anchorAPos, scale(direction, this.strength * 0.5))
	}
}

export { ForceJoint }
