import type { Rigidbody } from "@/Rigidbody"
import { DrawUtils } from "@/utils/DrawUtils"
import { Add, Scale, Sub, Vector2 } from "@/Vector2"

/**
 * @abstract A collision manifold are contact points of a collision. When a
 * collision occurs, it must be resolved. We resolve a collision so that
 * two vectors don't occupy the same space. When resolving the collision we
 * want to ensure that the physics is preserved and the objects move in an
 * expected way.
 */
class CollisionManifold {
	private depth: number
	private normal: Vector2
	private penetrationPoint: Vector2
	private rigA: Rigidbody | null
	private rigB: Rigidbody | null

	constructor(depth: number, normal: Vector2, penetrationPoint: Vector2) {
		this.depth = depth
		this.normal = normal
		this.penetrationPoint = penetrationPoint
		this.rigA = null
		this.rigB = null
	}

	/**
	 * @description Performs Angular Velocity, Linear Impulse, Frictional Force
	 * calculations.
	 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
	 * Chapter 12 Mechanics 2: Linear and Rotational Dynamics
	 * @returns {void} Resolves collisions
	 */
	resolveCollision(): void {
		/**
		 * Preventing division by 0, since mass will be 0 if isKinematic is true.
		 * @see RigidBody class constructor
		 */
		if (this.rigA?.getKinematicFlag() && this.rigB?.getKinematicFlag()) return

		// Calculate direction from penetration point to the center
		let penetrationToCentroidA = Sub(
			this.penetrationPoint,
			this.rigA!.getShape().getCentroid(),
		)
		let penetrationToCentroidB = Sub(
			this.penetrationPoint,
			this.rigB!.getShape().getCentroid(),
		)

		/**
		 * Angular Velocity
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.5 Rotational Dynamics
		 */
		let angularVelocityPenetrationCentroidA = new Vector2(
			-1 * this.rigA!.getAngularVelocity() * penetrationToCentroidA.y,
			this.rigA!.getAngularVelocity() * penetrationToCentroidA.x,
		)

		let angularVelocityPenetrationCentroidB = new Vector2(
			-1 * this.rigB!.getAngularVelocity() * penetrationToCentroidB.y,
			this.rigB!.getAngularVelocity() * penetrationToCentroidB.x,
		)

		// Linear velocity at penetration point with respect to the angular velocity.
		let velA = Add(
			this.rigA!.getVelocity(),
			angularVelocityPenetrationCentroidA,
		)
		let velB = Add(
			this.rigB!.getVelocity(),
			angularVelocityPenetrationCentroidB,
		)

		/**
		 * Linear Impulse
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.4.2 General Collision Response
		 */
		// Calculate impulse multiplier

		// Calculate relative velocity
		// relativeVelocity = v1 - v2
		// k = [-(e+1) * relativeVelocity.Dot(normal)] / (1/m1 + 1/m2) * (normal * normal)
		let relativeVelocity = Sub(velB, velA)
		let relVelocityAlongNormal = relativeVelocity.Dot(this.normal)

		if (relVelocityAlongNormal > 0) return

		/**
		 * Calculating the Restitution Coefficient
		 * This is really the bounciness of the material
		 * @see Material class
		 */
		let e =
			(2 *
				this.rigA!.getMaterial().getRestitution() *
				this.rigB!.getMaterial().getRestitution()) /
			(this.rigA!.getMaterial().getRestitution() +
				this.rigB!.getMaterial().getRestitution())

		let pToCentroidCrossNormalA = penetrationToCentroidA.Cross(this.normal)
		let pToCentroidCrossNormalB = penetrationToCentroidB.Cross(this.normal)

		let rigAInvInertia = this.rigA!.getInverseInertia()
		let rigBInvInertia = this.rigB!.getInverseInertia()

		let crossNSum =
			pToCentroidCrossNormalA * pToCentroidCrossNormalA * rigAInvInertia +
			pToCentroidCrossNormalB * pToCentroidCrossNormalB * rigBInvInertia

		let linearImpulse = -(e + 1) * relVelocityAlongNormal
		linearImpulse /=
			(this.rigA!.getInverseMass() + this.rigB!.getInverseMass() + crossNSum) *
			this.normal.Dot(this.normal)

		// Calculate the post-impulse velocity
		// v1` = v1 + kn / m1
		// v2` = v2 - kn / m2
		let kn = Scale(this.normal, linearImpulse)
		this.rigA!.setVelocity(
			Sub(this.rigA!.getVelocity(), Scale(kn, this.rigA!.getInverseMass())),
		)
		this.rigB?.setVelocity(
			Add(this.rigB.getVelocity(), Scale(kn, this.rigB.getInverseMass())),
		)

		this.rigA!.setAngularVelocity(
			this.rigA!.getAngularVelocity() +
				-pToCentroidCrossNormalA * linearImpulse * rigAInvInertia,
		)

		this.rigB!.setAngularVelocity(
			this.rigB!.getAngularVelocity() +
				pToCentroidCrossNormalB * linearImpulse * rigBInvInertia,
		)

		/**
		 * Frictional Impulses
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.2.2 Frictional Forces
		 */
		let velocityInNormalDirection = Scale(
			this.normal,
			relativeVelocity.Dot(this.normal),
		)
		let tangent = Sub(relativeVelocity, velocityInNormalDirection)
		tangent = Scale(tangent, -1)

		let friction = Math.min(
			this.rigA!.getMaterial().getFriction(),
			this.rigB!.getMaterial().getFriction(),
		)

		if (tangent.x > 0.00001 || tangent.y > 0.00001) {
			tangent.Normalize()
			DrawUtils.drawArrow(
				this.rigA!.getShape().getCentroid(),
				Add(this.rigA!.getShape().getCentroid(), Scale(tangent, 40)),
				"blue",
			)
		}

		let pToCentroidCrossTangentA = penetrationToCentroidA.Cross(tangent)
		let pToCentroidCrossTangentB = penetrationToCentroidB.Cross(tangent)

		let crossSumTangent =
			pToCentroidCrossTangentA * pToCentroidCrossTangentA * rigAInvInertia +
			pToCentroidCrossTangentB * pToCentroidCrossTangentB * rigBInvInertia

		let frictionalImpulse = -(e + 1) * relativeVelocity.Dot(tangent) * friction
		frictionalImpulse /=
			(this.rigA!.getInverseMass() +
				this.rigB!.getInverseMass() +
				crossSumTangent) *
			this.normal.Dot(this.normal)

		if (frictionalImpulse > linearImpulse) {
			frictionalImpulse = linearImpulse
		}

		let frictionalImpulseVector = Scale(tangent, frictionalImpulse)
		this.rigA!.setVelocity(
			Sub(
				this.rigA!.getVelocity(),
				Scale(frictionalImpulseVector, this.rigA!.getInverseMass()),
			),
		)
		this.rigB!.setVelocity(
			Add(
				this.rigB!.getVelocity(),
				Scale(frictionalImpulseVector, this.rigB!.getInverseMass()),
			),
		)
		this.rigA!.setAngularVelocity(
			this.rigA!.getAngularVelocity() +
				-pToCentroidCrossTangentA * frictionalImpulse * rigAInvInertia,
		)

		this.rigB!.setAngularVelocity(
			this.rigB!.getAngularVelocity() +
				pToCentroidCrossTangentB * frictionalImpulse * rigBInvInertia,
		)
	}

	/**
	 * @todo Learn more about positional correction.
	 */
	positionalCorrection(): void {
		// Objects will be pushed out by x%
		let correctionPercentage = 0.9
		let amountToCorrect =
			(this.depth /
				(this.rigA!.getInverseMass() + this.rigB!.getInverseMass())) *
			correctionPercentage
		let correctionVec = Scale(this.normal, amountToCorrect)
		let rigAMovement = Scale(correctionVec, this.rigA!.getInverseMass() * -1)
		let rigBMovement = Scale(correctionVec, this.rigB!.getInverseMass())

		if (!this.rigA?.getKinematicFlag()) {
			this.rigA!.getShape().move(rigAMovement)
		}

		if (!this.rigB?.getKinematicFlag()) {
			this.rigB!.getShape().move(rigBMovement)
		}
	}

	setRigidbodyA(rig: Rigidbody): void {
		this.rigA = rig
	}

	setRigidbodyB(rig: Rigidbody): void {
		this.rigB = rig
	}

	getDepth(): number {
		return this.depth
	}

	getPenetrationPoint(): Vector2 {
		return this.penetrationPoint
	}

	getNormal(): Vector2 {
		return this.normal
	}

	draw(): void {
		let startPoint = Add(
			this.penetrationPoint,
			Scale(this.normal, this.depth * -1),
		)

		DrawUtils.drawArrow(startPoint, this.penetrationPoint, "gray")
		DrawUtils.drawPoint(this.penetrationPoint, 3, "gray")
	}
}

export { CollisionManifold }
