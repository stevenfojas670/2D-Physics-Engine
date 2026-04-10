import type { Rigidbody } from "@/Rigidbody"
import { JointConnection } from "./JointConnection"

class Joint {
	protected jointConnection: JointConnection
	protected rigA: Rigidbody
	protected rigB: Rigidbody
	private anchorAID: number
	private anchorBID: number

	/**
	 *
	 * @param {JointConnection} jointConnection
	 */
	constructor(jointConnection: JointConnection) {
		this.jointConnection = jointConnection
		this.rigA = this.jointConnection.getRigidBodyA()
		this.rigB = this.jointConnection.getRigidBodyB()
		this.anchorAID = this.jointConnection.getAnchorAID()
		this.anchorBID = this.jointConnection.getAnchorBID()

		if (new.target === Joint) {
			throw new TypeError(
				"Cannot construct Abstract instances directly of class 'Joint'.",
			)
		}
	}

	getAnchorAPos() {
		return this.rigA.getShape().getAnchorPos(this.anchorAID)
	}

	getAnchorBPos() {
		return this.rigB.getShape().getAnchorPos(this.anchorBID)
	}

	updateConnectionA(): void {}
	updateConnectionB(): void {}

	draw(): void {
		this.jointConnection.draw()
	}
}

export { Joint }
