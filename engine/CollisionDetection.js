/**
 *
 */
class CollisionDetection {
	/**
	 *
	 * @param {Circle} shapeCircleA
	 * @param {Circle} shapeCircleB
	 * @returns {CollisionManifold | null} Returns the collision points or null
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

	/**
	 *
	 * @param {Circle} shapeCircleA
	 * @param {Circle} shapeCircleB
	 * @returns {CollisionManifold | null} Returns the collision points or null
	 */
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

	/**
	 *
	 * @param {Polygon} shapePolygonA
	 * @param {Polygon} shapePolygonB
	 * @returns {CollisionManifold} Collision Point
	 */
	static polygonVsPolygon(shapePolygonA, shapePolygonB) {
		let resultingContact = null; // Resulting collision manifold

		let contactPolyA = this.getContactPoint(shapePolygonA, shapePolygonB);
		// If collision is not occurring then no contact point will be found
		if (contactPolyA == null) return null;

		let contactPolyB = this.getContactPoint(shapePolygonB, shapePolygonA);
		// If collision is not occurring then no contact point will be found
		if (contactPolyB == null) return null;

		if (contactPolyA.depth < contactPolyB.depth) {
			resultingContact = new CollisionManifold(
				contactPolyA.depth,
				contactPolyA.normal,
				contactPolyA.penetrationPoint
			);
		} else {
			// @question Why do I scale by -1 here?
			resultingContact = new CollisionManifold(
				contactPolyB.depth,
				Scale(contactPolyB.normal, -1),
				contactPolyB.penetrationPoint
			);
		}

		return resultingContact;
	}

	/**
	 *
	 * @param {Polygon} shapePolygonA
	 * @param {Polygon} shapePolygonB
	 * @returns {CollisionManifold} CollisionManifold with minimum penetration depth
	 */
	static getContactPoint(shapePolygonA, shapePolygonB) {
		let contact = null;
		let minimumPenetrationDepth = Number.MAX_VALUE;

		// Iterate through each normal of polyA and call findSupportPoint
		for (let i = 0; i < shapePolygonA.normals.length; i++) {
			let pointOnEdge = shapePolygonA.vertices[i];
			let normalOnEdge = shapePolygonA.normals[i];

			let supportPoint = this.findSupportPoint(
				normalOnEdge,
				pointOnEdge,
				shapePolygonB.vertices
			);

			if (supportPoint == null) return null;

			if (supportPoint.penetrationDepth < minimumPenetrationDepth) {
				minimumPenetrationDepth = supportPoint.penetrationDepth;
				contact = new CollisionManifold(
					minimumPenetrationDepth,
					normalOnEdge,
					supportPoint.vertex
				);
			}
		}

		return contact;
	}

	/**
	 *
	 * @param {number} normalOnEdge
	 * @param {Vector2} pointOnEdge
	 * @param {Array} otherPolygonVertices
	 * @description
	 * 1. Gets a direction vector from verticeA to each vertice
	 * on verticesB.
	 * 2. Calculates the depth from each direction on the normal
	 * 	- depth = Sub(verticesB[i] - verticeA).dot(normal)
	 * 3. Returns the largest projection (penetration depth)
	 * @returns {SupportPoint} Support Point with the largest penetration depth
	 */
	static findSupportPoint(normalOnEdge, pointOnEdge, otherPolygonVertices) {
		let largestPenetrationDepth = 0;
		let supportPoint = null;

		for (let i = 0; i < otherPolygonVertices.length; i++) {
			let penetrationDepth = Sub(otherPolygonVertices[i], pointOnEdge).Dot(
				Scale(normalOnEdge, -1)
			);

			if (penetrationDepth > largestPenetrationDepth) {
				largestPenetrationDepth = penetrationDepth;
				supportPoint = new SupportPoint(
					otherPolygonVertices[i],
					largestPenetrationDepth
				);
			}
		}

		return supportPoint;
	}
}

/**
 *
 */
class SupportPoint {
	constructor(vertex, penetrationDepth) {
		this.vertex = vertex;
		this.penetrationDepth = penetrationDepth;
	}
}
