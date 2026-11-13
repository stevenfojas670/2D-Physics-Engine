import type { RigidBody } from "@/RigidBody"
import { DrawUtils } from "@/utils/DrawUtils"
import { add, scale, subtract, Vector2 } from "@/Vector2"

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
	private rigA: RigidBody | null
	private rigB: RigidBody | null

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
		const penetrationToCentroidA = subtract(
			this.penetrationPoint,
			this.rigA!.getShape().getCentroid(),
		)
		const penetrationToCentroidB = subtract(
			this.penetrationPoint,
			this.rigB!.getShape().getCentroid(),
		)

		/**
		 * Angular Velocity
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.5 Rotational Dynamics
		 */
		const angularVelocityPenetrationCentroidA = new Vector2(
			-1 * this.rigA!.getAngularVelocity() * penetrationToCentroidA.y,
			this.rigA!.getAngularVelocity() * penetrationToCentroidA.x,
		)

		const angularVelocityPenetrationCentroidB = new Vector2(
			-1 * this.rigB!.getAngularVelocity() * penetrationToCentroidB.y,
			this.rigB!.getAngularVelocity() * penetrationToCentroidB.x,
		)

		// Linear velocity at penetration point with respect to the angular velocity.
		const velA = add(
			this.rigA!.getVelocity(),
			angularVelocityPenetrationCentroidA,
		)
		const velB = add(
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
		const relativeVelocity = subtract(velB, velA)
		const relVelocityAlongNormal = relativeVelocity.dot(this.normal)

		if (relVelocityAlongNormal > 0) return

		/**
		 * Calculating the Restitution Coefficient
		 * This is really the bounciness of the material
		 * @see Material class
		 */
		const e =
			(2 *
				this.rigA!.getMaterial().getRestitution() *
				this.rigB!.getMaterial().getRestitution()) /
			(this.rigA!.getMaterial().getRestitution() +
				this.rigB!.getMaterial().getRestitution())

		const pToCentroidCrossNormalA = penetrationToCentroidA.cross(this.normal)
		const pToCentroidCrossNormalB = penetrationToCentroidB.cross(this.normal)

		const rigAInvInertia = this.rigA!.getInverseInertia()
		const rigBInvInertia = this.rigB!.getInverseInertia()

		const crossNSum =
			pToCentroidCrossNormalA * pToCentroidCrossNormalA * rigAInvInertia +
			pToCentroidCrossNormalB * pToCentroidCrossNormalB * rigBInvInertia

		let linearImpulse = -(e + 1) * relVelocityAlongNormal
		linearImpulse /=
			(this.rigA!.getInverseMass() + this.rigB!.getInverseMass() + crossNSum) *
			this.normal.dot(this.normal)

		// Calculate the post-impulse velocity
		// v1` = v1 + kn / m1
		// v2` = v2 - kn / m2
		const kn = scale(this.normal, linearImpulse)
		this.rigA!.setVelocity(
			subtract(
				this.rigA!.getVelocity(),
				scale(kn, this.rigA!.getInverseMass()),
			),
		)
		this.rigB?.setVelocity(
			add(this.rigB.getVelocity(), scale(kn, this.rigB.getInverseMass())),
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
		const velocityInNormalDirection = scale(
			this.normal,
			relativeVelocity.dot(this.normal),
		)
		let tangent = subtract(relativeVelocity, velocityInNormalDirection)
		tangent = scale(tangent, -1)

		const friction = Math.min(
			this.rigA!.getMaterial().getFriction(),
			this.rigB!.getMaterial().getFriction(),
		)

		if (tangent.x > 0.00001 || tangent.y > 0.00001) {
			tangent.normalize()
			DrawUtils.drawArrow(
				this.rigA!.getShape().getCentroid(),
				add(this.rigA!.getShape().getCentroid(), scale(tangent, 40)),
				"blue",
			)
		}

		const pToCentroidCrossTangentA = penetrationToCentroidA.cross(tangent)
		const pToCentroidCrossTangentB = penetrationToCentroidB.cross(tangent)

		const crossSumTangent =
			pToCentroidCrossTangentA * pToCentroidCrossTangentA * rigAInvInertia +
			pToCentroidCrossTangentB * pToCentroidCrossTangentB * rigBInvInertia

		let frictionalImpulse = -(e + 1) * relativeVelocity.dot(tangent) * friction
		frictionalImpulse /=
			(this.rigA!.getInverseMass() +
				this.rigB!.getInverseMass() +
				crossSumTangent) *
			this.normal.dot(this.normal)

		if (frictionalImpulse > linearImpulse) {
			frictionalImpulse = linearImpulse
		}

		const frictionalImpulseVector = scale(tangent, frictionalImpulse)
		this.rigA!.setVelocity(
			subtract(
				this.rigA!.getVelocity(),
				scale(frictionalImpulseVector, this.rigA!.getInverseMass()),
			),
		)
		this.rigB!.setVelocity(
			add(
				this.rigB!.getVelocity(),
				scale(frictionalImpulseVector, this.rigB!.getInverseMass()),
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
		const correctionPercentage = 0.9
		const amountToCorrect =
			(this.depth /
				(this.rigA!.getInverseMass() + this.rigB!.getInverseMass())) *
			correctionPercentage
		const correctionVec = scale(this.normal, amountToCorrect)
		const rigAMovement = scale(correctionVec, this.rigA!.getInverseMass() * -1)
		const rigBMovement = scale(correctionVec, this.rigB!.getInverseMass())

		if (!this.rigA?.getKinematicFlag()) {
			this.rigA!.getShape().move(rigAMovement)
		}

		if (!this.rigB?.getKinematicFlag()) {
			this.rigB!.getShape().move(rigBMovement)
		}
	}

	setRigidbodyA(rig: RigidBody): void {
		this.rigA = rig
	}

	setRigidbodyB(rig: RigidBody): void {
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
		const startPoint = add(
			this.penetrationPoint,
			scale(this.normal, this.depth * -1),
		)

		DrawUtils.drawArrow(startPoint, this.penetrationPoint, "gray")
		DrawUtils.drawPoint(this.penetrationPoint, 3, "gray")
	}
}

export { CollisionManifold }
