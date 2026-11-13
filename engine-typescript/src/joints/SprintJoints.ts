import { Joint } from "./Joint"
import type { JointConnection } from "./JointConnection"
import { Sub, Scale } from "@/Vector2"

/**
 * Spring joint that applies Hooke-like forces between two anchor points.
 */
class SpringJoint extends Joint {
	private springConstant: number
	private restLength: number

	/**
	 * @param connection - Anchor connection shared by the joint endpoints.
	 * @param springConstant - Strength of the spring response.
	 * @param restLength - Distance at which the spring is at equilibrium.
	 */
	constructor(
		connection: JointConnection,
		springConstant: number,
		restLength: number,
	) {
		super(connection)

		this.springConstant = springConstant
		this.restLength = restLength
	}

	/**
	 * Apply spring force from body A toward body B.
	 */
	updateConnectionA(): void {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = Sub(anchorBPos, anchorAPos)
		const distance = direction.Length()
		const restDistance = distance - this.restLength
		const forceHalving = this.rigB.getKinematicFlag() ? 1 : 0.5
		const forceMagnitude =
			restDistance * this.restLength * this.springConstant * forceHalving
		direction.Normalize()
		const force = Scale(direction, forceMagnitude)
		this.rigA.addForceAtPoint(anchorAPos, force)

		if (restDistance <= -5) {
			this.jointConnection.setColor("blue")
		} else if (restDistance > -5) {
			this.jointConnection.setColor("red")
		} else {
			this.jointConnection.setColor("orange")
		}
	}

	/**
	 * Apply spring force from body B toward body A.
	 */
	updateConnectionB() {
		const anchorAPos = this.getAnchorAPos()
		const anchorBPos = this.getAnchorBPos()

		const direction = Sub(anchorAPos, anchorBPos)
		const distance = direction.Length()
		const restDistance = distance - this.restLength
		const forceHalving = this.rigA.getKinematicFlag() ? 1 : 0.5
		const forceMagnitude =
			restDistance * this.restLength * this.springConstant * forceHalving
		direction.Normalize()
		const force = Scale(direction, forceMagnitude)
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
