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
		/**
		 * Linear Impulse
		 * @source 3D Math Primer for Graphics and Game Development 2nd Edition
		 * Chapter 12.4.2 General Collision Response
		 */
		// Calculate impulse multiplier
		// relativeVelocity = v1 - v2
		// k = [(e+1) * Dot(relativeVelcity, normal)] / (1/m1 + 1/m2) * (normal * normal)
		// Calculate the post-impulse velocity
		// v1` = v1 + kn / m1
		// v2` = v2 + kn / m2
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
