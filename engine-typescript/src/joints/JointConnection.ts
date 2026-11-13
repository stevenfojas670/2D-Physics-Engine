import type { RigidBody } from "@/RigidBody"
import { DrawUtils } from "@/utils/DrawUtils"

class JointConnection {
	private rigidBodyA: RigidBody
	private anchorAID: number
	private rigidBodyB: RigidBody
	private anchorBID: number
	private color: string

	constructor(
		rigidBodyA: RigidBody,
		anchorAID: number,
		rigidBodyB: RigidBody,
		anchorBID: number,
	) {
		this.rigidBodyA = rigidBodyA
		this.anchorAID = anchorAID
		this.rigidBodyB = rigidBodyB
		this.anchorBID = anchorBID
		this.color = "orange"
	}

	getAnchorAID(): number {
		return this.anchorAID
	}

	getAnchorBID(): number {
		return this.anchorBID
	}

	getRigidBodyA(): RigidBody {
		return this.rigidBodyA
	}

	getRigidBodyB(): RigidBody {
		return this.rigidBodyB
	}

	getColor(): string {
		return this.color
	}

	setAnchorAID(id: number): void {
		this.anchorAID = id
	}

	setAnchorBID(id: number): void {
		this.anchorBID = id
	}

	setColor(color: string): void {
		this.color = color
	}

	draw(): void {
		const start = this.rigidBodyA.getShape().getAnchorPos(this.anchorAID)
		const end = this.rigidBodyB.getShape().getAnchorPos(this.anchorBID)
		DrawUtils.drawLine(start, end, this.color)
	}
}

export { JointConnection }
