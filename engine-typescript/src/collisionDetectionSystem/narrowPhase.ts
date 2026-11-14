import type { ColliderColumns } from "@/shapes/colliderGeometry"
import { ColliderKind } from "@/shapes/colliderShapes"
import { Contact } from "./Contact"

const NO_SUPPORT = -1

const polygonContactA = new Contact()
const polygonContactB = new Contact()

function testCollision(
	colliders: ColliderColumns,
	slotA: number,
	slotB: number,
	centerAX: number,
	centerAY: number,
	centerBX: number,
	centerBY: number,
	out: Contact,
): boolean {
	const isCircleA = colliders.kind[slotA] === ColliderKind.CIRCLE
	const isCircleB = colliders.kind[slotB] === ColliderKind.CIRCLE

	if (isCircleA && isCircleB) {
		return circleVsCircle(
			centerAX,
			centerAY,
			colliders.radius[slotA],
			centerBX,
			centerBY,
			colliders.radius[slotB],
			out,
		)
	}
	if (!isCircleA && !isCircleB) {
		return polygonVsPolygon(
			colliders.worldVertices[slotA]!,
			colliders.worldNormals[slotA]!,
			colliders.worldVertices[slotB]!,
			colliders.worldNormals[slotB]!,
			out,
		)
	}
	if (isCircleA) {
		return circleVsPolygon(
			centerAX,
			centerAY,
			colliders.radius[slotA],
			colliders.worldVertices[slotB]!,
			colliders.worldNormals[slotB]!,
			out,
		)
	}
	const hit = circleVsPolygon(
		centerBX,
		centerBY,
		colliders.radius[slotB],
		colliders.worldVertices[slotA]!,
		colliders.worldNormals[slotA]!,
		out,
	)
	if (hit) {
		out.normalX = -out.normalX
		out.normalY = -out.normalY
	}
	return hit
}

function circleVsCircle(
	centerAX: number,
	centerAY: number,
	radiusA: number,
	centerBX: number,
	centerBY: number,
	radiusB: number,
	out: Contact,
): boolean {
	const directionX = centerBX - centerAX
	const directionY = centerBY - centerAY
	const radiusSum = radiusA + radiusB
	const distanceSquared = directionX * directionX + directionY * directionY
	if (distanceSquared >= radiusSum * radiusSum) {
		return false
	}
	const distance = Math.sqrt(distanceSquared)
	const normalX = distance > 0 ? directionX / distance : 1
	const normalY = distance > 0 ? directionY / distance : 0
	out.set(
		radiusSum - distance,
		normalX,
		normalY,
		centerAX + normalX * radiusA,
		centerAY + normalY * radiusA,
	)
	return true
}

function polygonVsPolygon(
	verticesA: Float64Array,
	normalsA: Float64Array,
	verticesB: Float64Array,
	normalsB: Float64Array,
	out: Contact,
): boolean {
	if (!deepestContact(verticesA, normalsA, verticesB, polygonContactA)) {
		return false
	}
	if (!deepestContact(verticesB, normalsB, verticesA, polygonContactB)) {
		return false
	}
	if (polygonContactA.depth < polygonContactB.depth) {
		out.set(
			polygonContactA.depth,
			polygonContactA.normalX,
			polygonContactA.normalY,
			polygonContactA.pointX,
			polygonContactA.pointY,
		)
	} else {
		out.set(
			polygonContactB.depth,
			-polygonContactB.normalX,
			-polygonContactB.normalY,
			polygonContactB.pointX,
			polygonContactB.pointY,
		)
	}
	return true
}

function deepestContact(
	edgeVertices: Float64Array,
	edgeNormals: Float64Array,
	otherVertices: Float64Array,
	out: Contact,
): boolean {
	let minimumDepth = Number.MAX_VALUE
	let found = false
	for (let edge = 0; edge < edgeNormals.length; edge += 2) {
		const edgeX = edgeVertices[edge]
		const edgeY = edgeVertices[edge + 1]
		const normalX = edgeNormals[edge]
		const normalY = edgeNormals[edge + 1]

		let supportOffset = NO_SUPPORT
		let largestDepth = 0
		for (let vertex = 0; vertex < otherVertices.length; vertex += 2) {
			const depth =
				-(otherVertices[vertex] - edgeX) * normalX -
				(otherVertices[vertex + 1] - edgeY) * normalY
			if (depth > largestDepth) {
				largestDepth = depth
				supportOffset = vertex
			}
		}
		if (supportOffset === NO_SUPPORT) {
			return false
		}
		if (largestDepth < minimumDepth) {
			minimumDepth = largestDepth
			found = true
			out.set(
				largestDepth,
				normalX,
				normalY,
				otherVertices[supportOffset],
				otherVertices[supportOffset + 1],
			)
		}
	}
	return found
}

function circleVsPolygon(
	centerX: number,
	centerY: number,
	radius: number,
	vertices: Float64Array,
	normals: Float64Array,
	out: Contact,
): boolean {
	return (
		circleVsPolygonEdges(centerX, centerY, radius, vertices, normals, out) ||
		circleVsPolygonCorners(centerX, centerY, radius, vertices, out)
	)
}

function circleVsPolygonEdges(
	centerX: number,
	centerY: number,
	radius: number,
	vertices: Float64Array,
	normals: Float64Array,
	out: Contact,
): boolean {
	const length = vertices.length
	let nearestOffset = NO_SUPPORT
	for (let offset = 0; offset < length; offset += 2) {
		const nextOffset = (offset + 2) % length
		let edgeX = vertices[nextOffset] - vertices[offset]
		let edgeY = vertices[nextOffset + 1] - vertices[offset + 1]
		const edgeLength = Math.hypot(edgeX, edgeY)
		if (edgeLength > 0) {
			edgeX /= edgeLength
			edgeY /= edgeLength
		}
		const toCircleX = centerX - vertices[offset]
		const toCircleY = centerY - vertices[offset + 1]
		const alongEdge = toCircleX * edgeX + toCircleY * edgeY
		const alongNormal =
			toCircleX * normals[offset] + toCircleY * normals[offset + 1]
		if (alongEdge > 0 && alongEdge < edgeLength && alongNormal >= 0) {
			nearestOffset = offset
		}
	}
	if (nearestOffset === NO_SUPPORT) {
		return false
	}

	const normalX = normals[nearestOffset]
	const normalY = normals[nearestOffset + 1]
	const toCircleX = centerX - vertices[nearestOffset]
	const toCircleY = centerY - vertices[nearestOffset + 1]
	const separation = toCircleX * normalX + toCircleY * normalY - radius
	if (separation >= 0) {
		return false
	}
	out.set(
		-separation,
		-normalX,
		-normalY,
		centerX - normalX * radius,
		centerY - normalY * radius,
	)
	return true
}

function circleVsPolygonCorners(
	centerX: number,
	centerY: number,
	radius: number,
	vertices: Float64Array,
	out: Contact,
): boolean {
	for (let offset = 0; offset < vertices.length; offset += 2) {
		const toCornerX = vertices[offset] - centerX
		const toCornerY = vertices[offset + 1] - centerY
		const distanceSquared = toCornerX * toCornerX + toCornerY * toCornerY
		if (distanceSquared < radius * radius) {
			const distance = Math.sqrt(distanceSquared)
			const normalX = distance > 0 ? toCornerX / distance : 1
			const normalY = distance > 0 ? toCornerY / distance : 0
			out.set(
				radius - distance,
				normalX,
				normalY,
				vertices[offset],
				vertices[offset + 1],
			)
			return true
		}
	}
	return false
}

export { testCollision }
