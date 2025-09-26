/**
 * @abstract A collision manifold are contact points of a collision. When a
 * collision occurs, it must be resolved. We resolve a collision so that
 * two vectors don't occupy the same space. When resolving the collision we
 * want to ensure that the physics is preserved and the objects move in an
 * expected way.
 */
class CollisionManifold {
	constructor(depth, normal, penetrationPoint) {
		this.depth = depth;
		this.normal = normal;
		this.penetrationPoint = penetrationPoint;
		this.rigA = null;
		this.rigB = null;
	}

	/**
	 * @description Performs Angular Velocity, Linear Impulse, Frictional Force
	 * calculations.
	 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
	 * Chapter 12 Mechanics 2: Linear and Rotational Dynamics
	 * @returns {void} Resolves collisions
	 */
	resolveCollision() {
		/**
		 * Preventing division by 0, since mass will be 0 if isKinematic is true.
		 * @see RigidBody class constructor
		 */
		if (this.rigA.isKinematic && this.rigB.isKinematic) return;

		// Calculate direction from penetration point to the center
		let penetrationToCentroidA = Sub(
			this.penetrationPoint,
			this.rigA.shape.centroid
		);
		let penetrationToCentroidB = Sub(
			this.penetrationPoint,
			this.rigB.shape.centroid
		);

		/**
		 * Angular Velocity
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.5 Rotational Dynamics
		 */
		let angularVelocityPenetrationCentroidA = new Vector2(
			-1 * this.rigA.angularVelocity * penetrationToCentroidA.y,
			this.rigA.angularVelocity * penetrationToCentroidA.x
		);

		let angularVelocityPenetrationCentroidB = new Vector2(
			-1 * this.rigB.angularVelocity * penetrationToCentroidB.y,
			this.rigB.angularVelocity * penetrationToCentroidB.x
		);

		// Linear velocity at penetration point with respect to the angular velocity.
		let velA = Add(this.rigA.velocity, angularVelocityPenetrationCentroidA);
		let velB = Add(this.rigB.velocity, angularVelocityPenetrationCentroidB);

		/**
		 * Linear Impulse
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.4.2 General Collision Response
		 */
		// Calculate impulse multiplier

		// Calculate relative velocity
		// relativeVelocity = v1 - v2
		// k = [-(e+1) * relativeVelocity.Dot(normal)] / (1/m1 + 1/m2) * (normal * normal)
		let relativeVelocity = Sub(velB, velA);
		let relVelocityAlongNormal = relativeVelocity.Dot(this.normal);

		if (relVelocityAlongNormal > 0) return;

		/**
		 * Calculating the Restitution Coefficient
		 * This is really the bounciness of the material
		 * @see Material class
		 */
		let e =
			(2 * this.rigA.material.restitution * this.rigB.material.restitution) /
			(this.rigA.material.restitution + this.rigB.material.restitution);

		let pToCentroidCrossNormalA = penetrationToCentroidA.Cross(this.normal);
		let pToCentroidCrossNormalB = penetrationToCentroidB.Cross(this.normal);

		let rigAInvInertia = this.rigA.invInertia;
		let rigBInvInertia = this.rigB.invInertia;

		let crossNSum =
			pToCentroidCrossNormalA * pToCentroidCrossNormalA * rigAInvInertia +
			pToCentroidCrossNormalB * pToCentroidCrossNormalB * rigBInvInertia;

		let linearImpulse = -(e + 1) * relVelocityAlongNormal;
		linearImpulse /=
			(this.rigA.invMass + this.rigB.invMass + crossNSum) *
			this.normal.Dot(this.normal);

		// Calculate the post-impulse velocity
		// v1` = v1 + kn / m1
		// v2` = v2 - kn / m2
		let kn = Scale(this.normal, linearImpulse);
		this.rigA.velocity = Sub(this.rigA.velocity, Scale(kn, this.rigA.invMass));
		this.rigB.velocity = Add(this.rigB.velocity, Scale(kn, this.rigB.invMass));

		this.rigA.angularVelocity +=
			-pToCentroidCrossNormalA * linearImpulse * rigAInvInertia;
		this.rigB.angularVelocity +=
			pToCentroidCrossNormalB * linearImpulse * rigBInvInertia;

		/**
		 * Frictional Impulses
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.2.2 Frictional Forces
		 */
		let velocityInNormalDirection = Scale(
			this.normal,
			relativeVelocity.Dot(this.normal)
		);
		let tangent = Sub(relativeVelocity, velocityInNormalDirection);
		tangent = Scale(tangent, -1);

		let friction = Math.min(
			this.rigA.material.friction,
			this.rigB.material.friction
		);

		if (tangent.x > 0.00001 || tangent.y > 0.00001) {
			tangent.Normalize();
			// DrawUtils.drawArrow(
			// 	this.rigA.shape.centroid,
			// 	Add(this.rigA.shape.centroid, Scale(tangent, 40)),
			// 	'blue'
			// );
		}

		let pToCentroidCrossTangentA = penetrationToCentroidA.Cross(tangent);
		let pToCentroidCrossTangentB = penetrationToCentroidB.Cross(tangent);

		let crossSumTangent =
			pToCentroidCrossTangentA * pToCentroidCrossTangentA * rigAInvInertia +
			pToCentroidCrossTangentB * pToCentroidCrossTangentB * rigBInvInertia;

		let frictionalImpulse = -(e + 1) * relativeVelocity.Dot(tangent) * friction;
		frictionalImpulse /=
			(this.rigA.invMass + this.rigB.invMass + crossSumTangent) *
			this.normal.Dot(this.normal);

		if (frictionalImpulse > linearImpulse) {
			frictionalImpulse = linearImpulse;
		}

		let frictionalImpulseVector = Scale(tangent, frictionalImpulse);
		this.rigA.velocity = Sub(
			this.rigA.velocity,
			Scale(frictionalImpulseVector, this.rigA.invMass)
		);
		this.rigB.velocity = Add(
			this.rigB.velocity,
			Scale(frictionalImpulseVector, this.rigB.invMass)
		);

		this.rigA.angularVelocity +=
			-pToCentroidCrossTangentA * frictionalImpulse * rigAInvInertia;
		this.rigB.angularVelocity +=
			pToCentroidCrossTangentB * frictionalImpulse * rigBInvInertia;
	}

	/**
	 * @todo Learn more about positional correction.
	 */
	positionalCorrection() {
		// Objects will be pushed out by x%
		let correctionPercentage = 0.9;
		let amountToCorrect =
			(this.depth / (this.rigA.invMass + this.rigB.invMass)) *
			correctionPercentage;
		let correctionVec = Scale(this.normal, amountToCorrect);
		let rigAMovement = Scale(correctionVec, this.rigA.invMass * -1);
		let rigBMovement = Scale(correctionVec, this.rigB.invMass);

		if (!this.rigA.isKinematic) {
			this.rigA.getShape().move(rigAMovement);
		}

		if (!this.rigB.isKinematic) {
			this.rigB.getShape().move(rigBMovement);
		}
	}

	draw(ctx) {
		let startPoint = Add(
			this.penetrationPoint,
			Scale(this.normal, this.depth * -1)
		);

		// DrawUtils.drawArrow(startPoint, this.penetrationPoint, 'gray');
		// DrawUtils.drawPoint(this.penetrationPoint, 3, 'gray');
	}
}
