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
	}

	resolveCollision() {
		// Linear Impulse
		let relativeVelocity = Sub(this.rigBodyB.velocity, this.rigBodyA.velocity);
		let relVelocityAlongNormal = relativeVelocity.Dot(this.normal);
		console.log(`Velocity along normal: ${relVelocityAlongNormal}`);

		if (relVelocityAlongNormal > 0) {
			return;
		}

		let e = 1;
		let j = -(1 + e) * relVelocityAlongNormal;
		let impulseVector = Scale(this.normal, j);
		let impulseVectorRigA = Scale(impulseVector, -0.5);
		let impulseVectorRigB = Scale(impulseVector, 0.5);

		this.rigBodyA.setVelocity(
			Add(this.rigBodyA.getVelocity(), impulseVectorRigA)
		);

		this.rigBodyB.setVelocity(
			Add(this.rigBodyB.getVelocity(), impulseVectorRigB)
		);
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
