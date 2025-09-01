/**
 *
 */
class CollisionDetection {
	/**
	 *
	 * @param {Shape} shapeA
	 * @param {Shape} shapeB
	 * @returns {CollisionManifold} collisionManifold
	 */
	static checkCollisions(shapeA, shapeB) {
		let collisionManifold = null;

		if (shapeA instanceof Circle && shapeB instanceof Circle) {
			collisionManifold = this.circleVsCircleOptimized(shapeA, shapeB);
		} else if (shapeA instanceof Polygon && shapeB instanceof Polygon) {
			collisionManifold = this.polygonVsPolygon(shapeA, shapeB);
		} else if (shapeA instanceof Circle && shapeB instanceof Polygon) {
			collisionManifold = this.circleVsPolygon(shapeA, shapeB);
		}

		return collisionManifold;
	}

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

	/**
	 *
	 * @param {Circle} shapeCircle
	 * @param {Polygon} shapePolygon
	 */
	static circleVsPolygon(shapeCircle, shapePolygon) {
		let contact = this.circleVsPolygonEdges(shapeCircle, shapePolygon);
		if (contact) {
			return contact;
		} else {
			return this.circleVsPolygonCorners(shapeCircle, shapePolygon);
		}
	}

	/**
	 *
	 * @param {Circle} shapeCircle
	 * @param {Polygon} shapePolygon
	 * @description Computing collisions for circles against polgyon edges.
	 * @returns {CollisionManifold} Collision Manifold - Circle's contact point on the polygon
	 */
	static circleVsPolygonEdges(shapeCircle, shapePolygon) {
		let verticesLength = shapePolygon.vertices.length;
		let circleCentroid = shapeCircle.centroid;
		let nearestEdgeVertex = null;
		let nearestEdgeNormal = null;

		for (let i = 0; i < verticesLength; i++) {
			let currVertex = shapePolygon.vertices[i];
			let currNormal = shapePolygon.normals[i];
			let nextVertex =
				shapePolygon.vertices[MathHelper.Index(i + 1, verticesLength)];

			let dirToNext = Sub(nextVertex, currVertex);
			let dirToNextLength = dirToNext.Length();
			dirToNext.Normalize();

			let vertToCircle = Sub(circleCentroid, currVertex);
			let circleProjectDirToNextProjection = vertToCircle.Dot(dirToNext);
			let circleDirToNormalProjection = vertToCircle.Dot(currNormal); // Extra for continuous collision thing

			if (
				circleProjectDirToNextProjection > 0 &&
				circleProjectDirToNextProjection < dirToNextLength &&
				circleDirToNormalProjection >= 0
			) {
				// Valid edge
				nearestEdgeNormal = currNormal;
				nearestEdgeVertex = currVertex;
			}
		}

		if (nearestEdgeNormal == null || nearestEdgeNormal == null) {
			return null;
		}

		// Checking for collision
		let circleRadius = shapeCircle.getRadius();
		let vertexToCircle = Sub(circleCentroid, nearestEdgeVertex);
		let projectionToEdgeNormal = vertexToCircle.Dot(nearestEdgeNormal);
		let penetrationDepth = projectionToEdgeNormal - circleRadius;

		if (penetrationDepth < 0) {
			// collision
			let scaledNormal = Scale(nearestEdgeNormal, circleRadius * -1);
			let penetrationPoint = Add(circleCentroid, scaledNormal);

			return new CollisionManifold(
				penetrationDepth * -1,
				Scale(nearestEdgeNormal, -1),
				penetrationPoint
			);
		}

		// no collision
		return null;
	}

	/**
	 *
	 * @param {Circle} shapeCircle
	 * @param {Polygon} shapePolygon
	 * @description Computing collisions against a polygon corner.
	 * @returns {CollisionManifold} Collision Manifold - Collision on polygon corner
	 */
	static circleVsPolygonCorners(shapeCircle, shapePolygon) {
		let verticesLength = shapePolygon.vertices.length;
		let circleRadius = shapeCircle.getRadius();
		let circleCentroid = shapeCircle.centroid;
		for (let i = 0; i < verticesLength; i++) {
			let currVertex = shapePolygon.vertices[i];
			let dirToCentroidCircle = Sub(currVertex, circleCentroid);

			if (dirToCentroidCircle.Length2() < circleRadius * circleRadius) {
				// collision
				let penetrationDepth = circleRadius - dirToCentroidCircle.Length();
				dirToCentroidCircle.Normalize();

				return new CollisionManifold(
					penetrationDepth,
					Scale(dirToCentroidCircle, 1),
					currVertex
				);
			}
		}
		return null;
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
