import type { Rigidbody } from "@/Rigidbody"
import { DrawUtils } from "@/utils/DrawUtils"

/**
 * Stores the relationship between two rigidbodies joined at anchor points.
 */
class JointConnection {
	private rigidBodyA: Rigidbody
	private anchorAID: number
	private rigidBodyB: Rigidbody
	private anchorBID: number
	private color: string

	/**
	 * @param rigidBodyA - First body in the connection.
	 * @param anchorAID - Anchor id on the first body.
	 * @param rigidBodyB - Second body in the connection.
	 * @param anchorBID - Anchor id on the second body.
	 */
	constructor(
		rigidBodyA: Rigidbody,
		anchorAID: number,
		rigidBodyB: Rigidbody,
		anchorBID: number,
	) {
		this.rigidBodyA = rigidBodyA
		this.anchorAID = anchorAID
		this.rigidBodyB = rigidBodyB
		this.anchorBID = anchorBID
		this.color = "orange"
	}

	/**
	 * @returns Anchor id used on the first body.
	 */
	getAnchorAID(): number {
		return this.anchorAID
	}

	/**
	 * @returns Anchor id used on the second body.
	 */
	getAnchorBID(): number {
		return this.anchorBID
	}

	/**
	 * @returns First rigidbody in the connection.
	 */
	getRigidBodyA(): Rigidbody {
		return this.rigidBodyA
	}

	/**
	 * @returns Second rigidbody in the connection.
	 */
	getRigidBodyB(): Rigidbody {
		return this.rigidBodyB
	}

	/**
	 * @returns Debug draw color used for the connection line.
	 */
	getColor(): string {
		return this.color
	}

	/**
	 * @param id - New anchor id for the first body.
	 */
	setAnchorAID(id: number): void {
		this.anchorAID = id
	}

	/**
	 * @param id - New anchor id for the second body.
	 */
	setAnchorBID(id: number): void {
		this.anchorBID = id
	}

	/**
	 * @param color - New debug draw color.
	 */
	setColor(color: string): void {
		this.color = color
	}

	/**
	 * Draw the line between both active anchor points.
	 */
	draw(): void {
		let start = this.rigidBodyA.getShape().getAnchorPos(this.anchorAID)
		let end = this.rigidBodyB.getShape().getAnchorPos(this.anchorBID)
		DrawUtils.drawLine(start, end, this.color)
	}
}

export { JointConnection }
