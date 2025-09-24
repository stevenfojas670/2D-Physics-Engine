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

	resolveCollision() {
		/**
		 * Linear Impulse
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.4.2 General Collision Response
		 */
		// Calculate impulse multiplier

		// relativeVelocity = v1 - v2
		// k = [-(e+1) * relativeVelocity.Dot(normal)] / (1/m1 + 1/m2) * (normal * normal)
		let relV = Sub(this.rigB.velocity, this.rigA.velocity);
		let relVAlongNorm = relV.Dot(this.normal);

		if (relVAlongNorm > 0) return;

		/**
		 * Preventing division by 0, since mass will be 0 if isKinematic is true.
		 * @see RigidBody class constructor
		 */
		if (this.rigA.isKinematic && this.rigB.isKinematic) return;

		/**
		 * Calculating the Restitution Coefficient
		 * This is really the bounciness of the material
		 * @see Material class
		 */
		let e =
			(2 * this.rigA.material.bounce * this.rigB.material.bounce) /
			(this.rigA.material.bounce + this.rigB.material.bounce);

		let dividend = -(e + 1) * relVAlongNorm;
		let divisor =
			(1 / (this.rigA.invMass + this.rigB.invMass)) *
			this.normal.Dot(this.normal);
		let k = dividend * divisor;

		// Calculate the post-impulse velocity
		// v1` = v1 + kn / m1
		// v2` = v2 - kn / m2
		let kn = Scale(this.normal, k);
		this.rigA.velocity = Add(
			this.rigA.velocity,
			Scale(kn, this.rigA.invMass * -1)
		);
		this.rigB.velocity = Add(this.rigB.velocity, Scale(kn, this.rigB.invMass));
	}

	positionalCorrection() {}

	draw(ctx) {
		let startPoint = Add(
			this.penetrationPoint,
			Scale(this.normal, this.depth * -1)
		);

		DrawUtils.drawArrow(startPoint, this.penetrationPoint, 'gray');
		DrawUtils.drawPoint(this.penetrationPoint, 3, 'gray');
	}
}
