import type { Rigidbody } from "@/Rigidbody"
import { Circle } from "@/shapes/Circle"
import { Polygon } from "@/shapes/Polygon"
import { Add, Scale, Sub, Vector2 } from "@/Vector2"
import { CollisionManifold } from "./CollisionManifold"
import MathHelper from "@/utils/MathHelpers"

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
	static checkCollisions(
		rigA: Rigidbody,
		rigB: Rigidbody,
	): CollisionManifold | null {
		let collisionManifold = null
		const shapeA = rigA.getShape()
		const shapeB = rigB.getShape()

		if (shapeA instanceof Circle && shapeB instanceof Circle) {
			collisionManifold = this.circleVsCircleOptimized(shapeA, shapeB)
		} else if (shapeA instanceof Polygon && shapeB instanceof Polygon) {
			collisionManifold = this.polygonVsPolygon(shapeA, shapeB)
		} else if (shapeA instanceof Circle && shapeB instanceof Polygon) {
			collisionManifold = this.circleVsPolygon(shapeA, shapeB)
		}

		if (collisionManifold != null) {
			collisionManifold.setRigidbodyA(rigA)
			collisionManifold.setRigidbodyB(rigB)
		}

		return collisionManifold
	}

	/**
	 *
	 * @param {Circle} shapeCircleA
	 * @param {Circle} shapeCircleB
	 * @returns {CollisionManifold | null} Returns the collision points or null
	 */
	static circleVsCircleOptimized(
		shapeCircleA: Circle,
		shapeCircleB: Circle,
	): CollisionManifold | null {
		const centroidA = shapeCircleA.getCentroid()
		const centroidB = shapeCircleB.getCentroid()

		// Get direction from one circle to another
		const direction = Sub(centroidB, centroidA)

		// Get distance between centroids
		const dist = direction.Length2()

		// Get radius of circles and calculate the sum of the circles
		// rSquare = (a.radius + b.radius)^2
		const rSum = shapeCircleA.getRadius() + shapeCircleB.getRadius()
		const rSquare = rSum * rSum

		if (dist < rSquare) {
			const directionLength = direction.Length()
			const penetrationNormal = Scale(direction, 1 / directionLength)
			const penetrationDepth = directionLength - rSum
			const penetrationPoint = Add(
				centroidA,
				Scale(penetrationNormal, shapeCircleA.getRadius()),
			)

			return new CollisionManifold(
				penetrationDepth * -1,
				penetrationNormal,
				penetrationPoint,
			)
		} else {
			return null
		}
	}

	/**
	 *
	 * @param {Circle} shapeCircleA
	 * @param {Circle} shapeCircleB
	 * @returns {CollisionManifold | null} Returns the collision points or null
	 */
	static circleVsCircleActual(
		shapeCircleA: Circle,
		shapeCircleB: Circle,
	): CollisionManifold | null {
		const centroidA = shapeCircleA.getCentroid()
		const centroidB = shapeCircleB.getCentroid()

		// Get direction from one circle to another
		const direction = Sub(centroidA, centroidB)

		// Get distance between centroids
		const dist = direction.Length()

		// Get radius of circles
		const radiusA = shapeCircleA.getRadius()
		const radiusB = shapeCircleB.getRadius()

		const rSum = radiusA + radiusB
		const rSquare = rSum * rSum

		if (dist < rSquare) {
			const directionLength = direction.Length()
			const penetrationNormal = Scale(direction, 1 / directionLength)
			const penetrationDepth = directionLength - rSum
			const penetrationPoint = Add(
				centroidA,
				Scale(penetrationNormal, shapeCircleA.getRadius()),
			)

			return new CollisionManifold(
				penetrationDepth * -1,
				penetrationNormal,
				penetrationPoint,
			)
		} else {
			return null
		}
	}

	/**
	 *
	 * @param {Polygon} shapePolygonA
	 * @param {Polygon} shapePolygonB
	 * @returns {CollisionManifold} Collision Point
	 */
	static polygonVsPolygon(
		shapePolygonA: Polygon,
		shapePolygonB: Polygon,
	): CollisionManifold | null {
		let resultingContact: CollisionManifold // Resulting collision manifold

		const contactPolyA = this.getContactPoint(shapePolygonA, shapePolygonB)
		// If collision is not occurring then no contact point will be found
		if (contactPolyA == null) return null

		const contactPolyB = this.getContactPoint(shapePolygonB, shapePolygonA)
		// If collision is not occurring then no contact point will be found
		if (contactPolyB == null) return null

		if (contactPolyA.getDepth() < contactPolyB.getDepth()) {
			resultingContact = new CollisionManifold(
				contactPolyA.getDepth(),
				contactPolyA.getNormal(),
				contactPolyA.getPenetrationPoint(),
			)
		} else {
			// @question Why do I scale by -1 here?
			resultingContact = new CollisionManifold(
				contactPolyB.getDepth(),
				Scale(contactPolyB.getNormal(), -1),
				contactPolyB.getPenetrationPoint(),
			)
		}

		return resultingContact
	}

	/**
	 *
	 * @param {Polygon} shapePolygonA
	 * @param {Polygon} shapePolygonB
	 * @returns {CollisionManifold} CollisionManifold with minimum penetration depth
	 */
	static getContactPoint(
		shapePolygonA: Polygon,
		shapePolygonB: Polygon,
	): CollisionManifold | null {
		let contact = null
		let minimumPenetrationDepth = Number.MAX_VALUE

		// Iterate through each normal of polyA and call findSupportPoint
		const normalsA = shapePolygonA.getNormals()
		const verticesA = shapePolygonA.getVertices()
		const verticesB = shapePolygonB.getVertices()

		for (let i = 0; i < normalsA.length; i++) {
			const pointOnEdge = verticesA[i]
			const normalOnEdge = normalsA[i]

			const supportPoint = this.findSupportPoint(
				normalOnEdge,
				pointOnEdge,
				verticesB,
			)

			if (supportPoint == null) return null

			if (supportPoint.penetrationDepth < minimumPenetrationDepth) {
				minimumPenetrationDepth = supportPoint.penetrationDepth
				contact = new CollisionManifold(
					minimumPenetrationDepth,
					normalOnEdge,
					supportPoint.vertex,
				)
			}
		}

		return contact
	}

	/**
	 *
	 * @param {Vector2} normalOnEdge
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
	static findSupportPoint(
		normalOnEdge: Vector2,
		pointOnEdge: Vector2,
		otherPolygonVertices: Vector2[],
	): SupportPoint | null {
		let largestPenetrationDepth = 0
		let supportPoint = null

		for (let i = 0; i < otherPolygonVertices.length; i++) {
			const penetrationDepth = Sub(otherPolygonVertices[i], pointOnEdge).Dot(
				Scale(normalOnEdge, -1),
			)

			if (penetrationDepth > largestPenetrationDepth) {
				largestPenetrationDepth = penetrationDepth
				supportPoint = new SupportPoint(
					otherPolygonVertices[i],
					largestPenetrationDepth,
				)
			}
		}

		return supportPoint
	}

	/**
	 *
	 * @param {Circle} shapeCircle
	 * @param {Polygon} shapePolygon
	 */
	static circleVsPolygon(shapeCircle: Circle, shapePolygon: Polygon) {
		const contact = this.circleVsPolygonEdges(shapeCircle, shapePolygon)
		if (contact) {
			return contact
		} else {
			return this.circleVsPolygonCorners(shapeCircle, shapePolygon)
		}
	}

	/**
	 *
	 * @param {Circle} shapeCircle
	 * @param {Polygon} shapePolygon
	 * @description Computing collisions for circles against polgyon edges.
	 * @returns {CollisionManifold} Collision Manifold - Circle's contact point on the polygon
	 */
	static circleVsPolygonEdges(
		shapeCircle: Circle,
		shapePolygon: Polygon,
	): CollisionManifold | null {
		const polygonVertices = shapePolygon.getVertices()
		const verticesLength = polygonVertices.length
		const polygonNormals = shapePolygon.getNormals()
		const circleCentroid = shapeCircle.getCentroid()
		let nearestEdgeVertex = null
		let nearestEdgeNormal = null

		for (let i = 0; i < verticesLength; i++) {
			const currVertex = polygonVertices[i]
			const currNormal = polygonNormals[i]
			const nextVertex =
				polygonVertices[MathHelper.Index(i + 1, verticesLength)]

			const dirToNext = Sub(nextVertex, currVertex)
			const dirToNextLength = dirToNext.Length()
			dirToNext.Normalize()

			const vertToCircle = Sub(circleCentroid, currVertex)
			const circleProjectDirToNextProjection = vertToCircle.Dot(dirToNext)
			const circleDirToNormalProjection = vertToCircle.Dot(currNormal) // Extra for continuous collision thing

			if (
				circleProjectDirToNextProjection > 0 &&
				circleProjectDirToNextProjection < dirToNextLength &&
				circleDirToNormalProjection >= 0
			) {
				// Valid edge
				nearestEdgeNormal = currNormal
				nearestEdgeVertex = currVertex
			}
		}

		if (nearestEdgeNormal == null || nearestEdgeNormal == null) {
			return null
		}

		// Checking for collision
		const circleRadius = shapeCircle.getRadius()
		const vertexToCircle = Sub(circleCentroid, nearestEdgeVertex!)
		const projectionToEdgeNormal = vertexToCircle.Dot(nearestEdgeNormal)
		const penetrationDepth = projectionToEdgeNormal - circleRadius

		if (penetrationDepth < 0) {
			// collision
			const scaledNormal = Scale(nearestEdgeNormal, circleRadius * -1)
			const penetrationPoint = Add(circleCentroid, scaledNormal)

			return new CollisionManifold(
				penetrationDepth * -1,
				Scale(nearestEdgeNormal, -1),
				penetrationPoint,
			)
		}

		// no collision
		return null
	}

	/**
	 *
	 * @param {Circle} shapeCircle
	 * @param {Polygon} shapePolygon
	 * @description Computing collisions against a polygon corner.
	 * @returns {CollisionManifold} Collision Manifold - Collision on polygon corner
	 */
	static circleVsPolygonCorners(
		shapeCircle: Circle,
		shapePolygon: Polygon,
	): CollisionManifold | null {
		const vertices = shapePolygon.getVertices()
		const verticesLength = vertices.length
		const circleRadius = shapeCircle.getRadius()
		const circleCentroid = shapeCircle.getCentroid()
		for (let i = 0; i < verticesLength; i++) {
			const currVertex = vertices[i]
			const dirToCentroidCircle = Sub(currVertex, circleCentroid)

			if (dirToCentroidCircle.Length2() < circleRadius * circleRadius) {
				// collision
				const penetrationDepth = circleRadius - dirToCentroidCircle.Length()
				dirToCentroidCircle.Normalize()

				return new CollisionManifold(
					penetrationDepth,
					Scale(dirToCentroidCircle, 1),
					currVertex,
				)
			}
		}
		return null
	}
}

/**
 *
 */
class SupportPoint {
	public penetrationDepth: number
	public vertex: Vector2

	constructor(vertex: Vector2, penetrationDepth: number) {
		this.vertex = vertex
		this.penetrationDepth = penetrationDepth
	}
}

export { CollisionDetection }
