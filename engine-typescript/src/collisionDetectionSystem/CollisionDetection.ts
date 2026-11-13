import type { RigidBody } from "@/RigidBody"
import { Circle } from "@/shapes/Circle"
import { Polygon } from "@/shapes/Polygon"
import { add, scale, subtract, Vector2 } from "@/Vector2"
import { CollisionManifold } from "./CollisionManifold"
import { MathHelper } from "@/utils/MathHelper"

class CollisionDetection {
	static checkCollisions(
		rigA: RigidBody,
		rigB: RigidBody,
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

	static circleVsCircleOptimized(
		shapeCircleA: Circle,
		shapeCircleB: Circle,
	): CollisionManifold | null {
		const centroidA = shapeCircleA.getCentroid()
		const centroidB = shapeCircleB.getCentroid()

		const direction = subtract(centroidB, centroidA)

		const dist = direction.lengthSquared()

		const rSum = shapeCircleA.getRadius() + shapeCircleB.getRadius()
		const rSquare = rSum * rSum

		if (dist < rSquare) {
			const directionLength = direction.length()
			const penetrationNormal = scale(direction, 1 / directionLength)
			const penetrationDepth = directionLength - rSum
			const penetrationPoint = add(
				centroidA,
				scale(penetrationNormal, shapeCircleA.getRadius()),
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

	static circleVsCircleActual(
		shapeCircleA: Circle,
		shapeCircleB: Circle,
	): CollisionManifold | null {
		const centroidA = shapeCircleA.getCentroid()
		const centroidB = shapeCircleB.getCentroid()

		const direction = subtract(centroidA, centroidB)

		const dist = direction.length()

		const radiusA = shapeCircleA.getRadius()
		const radiusB = shapeCircleB.getRadius()

		const rSum = radiusA + radiusB
		const rSquare = rSum * rSum

		if (dist < rSquare) {
			const directionLength = direction.length()
			const penetrationNormal = scale(direction, 1 / directionLength)
			const penetrationDepth = directionLength - rSum
			const penetrationPoint = add(
				centroidA,
				scale(penetrationNormal, shapeCircleA.getRadius()),
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

	static polygonVsPolygon(
		shapePolygonA: Polygon,
		shapePolygonB: Polygon,
	): CollisionManifold | null {
		let resultingContact: CollisionManifold

		const contactPolyA = this.getContactPoint(shapePolygonA, shapePolygonB)
		if (contactPolyA == null) return null

		const contactPolyB = this.getContactPoint(shapePolygonB, shapePolygonA)
		if (contactPolyB == null) return null

		if (contactPolyA.getDepth() < contactPolyB.getDepth()) {
			resultingContact = new CollisionManifold(
				contactPolyA.getDepth(),
				contactPolyA.getNormal(),
				contactPolyA.getPenetrationPoint(),
			)
		} else {
			resultingContact = new CollisionManifold(
				contactPolyB.getDepth(),
				scale(contactPolyB.getNormal(), -1),
				contactPolyB.getPenetrationPoint(),
			)
		}

		return resultingContact
	}

	static getContactPoint(
		shapePolygonA: Polygon,
		shapePolygonB: Polygon,
	): CollisionManifold | null {
		let contact = null
		let minimumPenetrationDepth = Number.MAX_VALUE

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

	static findSupportPoint(
		normalOnEdge: Vector2,
		pointOnEdge: Vector2,
		otherPolygonVertices: Vector2[],
	): SupportPoint | null {
		let largestPenetrationDepth = 0
		let supportPoint = null

		for (let i = 0; i < otherPolygonVertices.length; i++) {
			const penetrationDepth = subtract(
				otherPolygonVertices[i],
				pointOnEdge,
			).dot(scale(normalOnEdge, -1))

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

	static circleVsPolygon(shapeCircle: Circle, shapePolygon: Polygon) {
		const contact = this.circleVsPolygonEdges(shapeCircle, shapePolygon)
		if (contact) {
			return contact
		} else {
			return this.circleVsPolygonCorners(shapeCircle, shapePolygon)
		}
	}

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
				polygonVertices[MathHelper.wrapIndex(i + 1, verticesLength)]

			const dirToNext = subtract(nextVertex, currVertex)
			const dirToNextLength = dirToNext.length()
			dirToNext.normalize()

			const vertToCircle = subtract(circleCentroid, currVertex)
			const circleProjectDirToNextProjection = vertToCircle.dot(dirToNext)
			const circleDirToNormalProjection = vertToCircle.dot(currNormal)

			if (
				circleProjectDirToNextProjection > 0 &&
				circleProjectDirToNextProjection < dirToNextLength &&
				circleDirToNormalProjection >= 0
			) {
				nearestEdgeNormal = currNormal
				nearestEdgeVertex = currVertex
			}
		}

		if (nearestEdgeNormal == null || nearestEdgeNormal == null) {
			return null
		}

		const circleRadius = shapeCircle.getRadius()
		const vertexToCircle = subtract(circleCentroid, nearestEdgeVertex!)
		const projectionToEdgeNormal = vertexToCircle.dot(nearestEdgeNormal)
		const penetrationDepth = projectionToEdgeNormal - circleRadius

		if (penetrationDepth < 0) {
			const scaledNormal = scale(nearestEdgeNormal, circleRadius * -1)
			const penetrationPoint = add(circleCentroid, scaledNormal)

			return new CollisionManifold(
				penetrationDepth * -1,
				scale(nearestEdgeNormal, -1),
				penetrationPoint,
			)
		}

		return null
	}

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
			const dirToCentroidCircle = subtract(currVertex, circleCentroid)

			if (dirToCentroidCircle.lengthSquared() < circleRadius * circleRadius) {
				const penetrationDepth = circleRadius - dirToCentroidCircle.length()
				dirToCentroidCircle.normalize()

				return new CollisionManifold(
					penetrationDepth,
					scale(dirToCentroidCircle, 1),
					currVertex,
				)
			}
		}
		return null
	}
}

class SupportPoint {
	public penetrationDepth: number
	public vertex: Vector2

	constructor(vertex: Vector2, penetrationDepth: number) {
		this.vertex = vertex
		this.penetrationDepth = penetrationDepth
	}
}

export { CollisionDetection }
