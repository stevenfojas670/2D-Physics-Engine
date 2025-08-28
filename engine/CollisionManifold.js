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

	resolveCollision() {}

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
