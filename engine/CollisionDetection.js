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
		let direction = Sub(centroidA, centroidB);

		// Get distance between centroids
		let dist = direction.Length2();

		// Get radius of circles and calculate the sum of the circles
		// rSquare = (a.radius + b.radius)^2
		let rSum = shapeCircleA.getRadius() + shapeCircleB.getRadius();
		let rSquare = rSum * rSum;

		if (dist < rSquare) {
			return true;
		} else {
			return false;
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
