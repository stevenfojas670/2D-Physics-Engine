import { Joint } from "./Joint"
import type { JointConnection } from "./JointConnection"
import { subtract, scale } from "@/Vector2"

class SpringJoint extends Joint {
	private springConstant: number
	private restLength: number

	constructor(
		connection: JointConnection,
		springConstant: number,
		restLength: number,
	) {
		super(connection)

		this.springConstant = springConstant
		this.restLength = restLength
	}

	updateConnectionA(): void {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = subtract(anchorBPos, anchorAPos)
		const distance = direction.length()
		const restDistance = distance - this.restLength
		const forceHalving = this.rigB.getKinematicFlag() ? 1 : 0.5
		const forceMagnitude =
			restDistance * this.restLength * this.springConstant * forceHalving
		direction.normalize()
		const force = scale(direction, forceMagnitude)
		this.rigA.addForceAtPoint(anchorAPos, force)

		if (restDistance <= -5) {
			this.jointConnection.setColor("blue")
		} else if (restDistance > -5) {
			this.jointConnection.setColor("red")
		} else {
			this.jointConnection.setColor("orange")
		}
	}

	updateConnectionB() {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = subtract(anchorAPos, anchorBPos)
		const distance = direction.length()
		const restDistance = distance - this.restLength
		const forceHalving = this.rigA.getKinematicFlag() ? 1 : 0.5
		const forceMagnitude =
			restDistance * this.restLength * this.springConstant * forceHalving
		direction.normalize()
		const force = scale(direction, forceMagnitude)
		this.rigB.addForceAtPoint(anchorBPos, force)

		if (restDistance <= -5) {
			this.jointConnection.setColor("blue")
		} else if (restDistance > -5) {
			this.jointConnection.setColor("red")
		} else {
			this.jointConnection.setColor("orange")
		}
	}
}

export { SpringJoint }
