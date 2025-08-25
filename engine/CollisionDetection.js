class CollisionDetection {
	/**
	 * @description
	 * @param {Circle} shapeCircleA
	 * @param {Circle} shapeCircleB
	 */
	static circleVsCircleOptimized(shapeCircleA, shapeCircleB) {
		let centroidA = shapeCircleA.getCentroid();
		let centroidB = shapeCircleB.getCentroid();

		// Get direction from one circle to another
		let direction = Sub(centroidB, centroidA);

		// Get distance between centroids
		let dist = direction.Length2();

		// Get radius of circles and calculate the sum of the circles
		// rSquare = (a.radius + b.radius)^2
		let rSum = shapeCircleA.getRadius() + shapeCircleB.getRadius();
		let rSquare = rSum * rSum;

		if (dist < rSquare) {
			let directionLength = direction.Length();
			let penetrationNormal = Scale(direction, 1 / directionLength);
			let penetrationDepth = directionLength - rSum;
			let penetrationPoint = Add(
				centroidA,
				Scale(penetrationNormal, shapeCircleA.getRadius())
			);

			return new CollisionManifold(
				penetrationDepth * -1,
				penetrationNormal,
				penetrationPoint
			);
		} else {
			return null;
		}
	}

	static circleVsCircleActual(shapeCircleA, shapeCircleB) {
		let centroidA = shapeCircleA.getCentroid();
		let centroidB = shapeCircleB.getCentroid();

		// Get direction from one circle to another
		let direction = Sub(centroidA, centroidB);

		// Get distance between centroids
		let dist = direction.Length();

		// Get radius of circles
		let radiusA = shapeCircleA.getRadius();
		let radiusB = shapeCircleB.getRadius();

		if (dist < radiusA + radiusB) {
			return true;
		} else {
			return false;
		}
	}
}
