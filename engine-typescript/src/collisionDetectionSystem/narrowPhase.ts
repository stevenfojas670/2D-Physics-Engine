import type { ColliderColumns } from "@/shapes/colliderGeometry"
import { ColliderKind } from "@/shapes/colliderShapes"
import type { ContactManifold } from "./ContactManifold"

const NO_SUPPORT = -1
const SEPARATED = -1
const RELATIVE_REFERENCE_TOLERANCE = 0.95
const ABSOLUTE_REFERENCE_TOLERANCE = 0.01
const CORNER_FEATURE_OFFSET = 16
const FLIP_SHIFT = 15
const REFERENCE_EDGE_SHIFT = 10
const INCIDENT_EDGE_SHIFT = 5
const FIRST_END = 0
const SECOND_END = 1

class Penetration {
	depth = 0
	edgeOffset = 0
}

class ClippedSegment {
	count = 0
	readonly x = new Float64Array(2)
	readonly y = new Float64Array(2)
	readonly end = new Int32Array(2)
}

const penetrationA = new Penetration()
const penetrationB = new Penetration()
const incidentSegment = new ClippedSegment()
const sideClipped = new ClippedSegment()
const fullyClipped = new ClippedSegment()

function testCollision(
	colliders: ColliderColumns,
	slotA: number,
	slotB: number,
	centerAX: number,
	centerAY: number,
	centerBX: number,
	centerBY: number,
	out: ContactManifold,
): boolean {
	out.clear()
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
		out.setNormal(-out.normalX, -out.normalY)
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
	out: ContactManifold,
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
	out.setNormal(normalX, normalY)
	out.addPoint(
		centerAX + normalX * radiusA,
		centerAY + normalY * radiusA,
		radiusSum - distance,
		0,
	)
	return true
}

function polygonVsPolygon(
	verticesA: Float64Array,
	normalsA: Float64Array,
	verticesB: Float64Array,
	normalsB: Float64Array,
	out: ContactManifold,
): boolean {
	if (!leastPenetration(verticesA, normalsA, verticesB, penetrationA)) {
		return false
	}
	if (!leastPenetration(verticesB, normalsB, verticesA, penetrationB)) {
		return false
	}
	const referenceIsB =
		penetrationB.depth <
		RELATIVE_REFERENCE_TOLERANCE * penetrationA.depth -
			ABSOLUTE_REFERENCE_TOLERANCE
	if (referenceIsB) {
		return clipContacts(
			verticesB,
			normalsB,
			penetrationB.edgeOffset,
			verticesA,
			normalsA,
			true,
			out,
		)
	}
	return clipContacts(
		verticesA,
		normalsA,
		penetrationA.edgeOffset,
		verticesB,
		normalsB,
		false,
		out,
	)
}

function leastPenetration(
	edgeVertices: Float64Array,
	edgeNormals: Float64Array,
	otherVertices: Float64Array,
	out: Penetration,
): boolean {
	let minimumDepth = Number.MAX_VALUE
	for (let edge = 0; edge < edgeNormals.length; edge += 2) {
		const edgeX = edgeVertices[edge]
		const edgeY = edgeVertices[edge + 1]
		const normalX = edgeNormals[edge]
		const normalY = edgeNormals[edge + 1]
		let largestDepth = SEPARATED
		for (let vertex = 0; vertex < otherVertices.length; vertex += 2) {
			const depth =
				-(otherVertices[vertex] - edgeX) * normalX -
				(otherVertices[vertex + 1] - edgeY) * normalY
			if (depth > largestDepth) {
				largestDepth = depth
			}
		}
		if (largestDepth <= 0) {
			return false
		}
		if (largestDepth < minimumDepth) {
			minimumDepth = largestDepth
			out.depth = largestDepth
			out.edgeOffset = edge
		}
	}
	return minimumDepth < Number.MAX_VALUE
}

function incidentEdgeOffset(
	incidentNormals: Float64Array,
	referenceNormalX: number,
	referenceNormalY: number,
): number {
	let bestOffset = 0
	let lowestDot = Number.MAX_VALUE
	for (let edge = 0; edge < incidentNormals.length; edge += 2) {
		const dot =
			incidentNormals[edge] * referenceNormalX +
			incidentNormals[edge + 1] * referenceNormalY
		if (dot < lowestDot) {
			lowestDot = dot
			bestOffset = edge
		}
	}
	return bestOffset
}

function clipToPlane(
	input: ClippedSegment,
	planeNormalX: number,
	planeNormalY: number,
	planeOffset: number,
	output: ClippedSegment,
): void {
	output.count = 0
	const distance0 =
		input.x[0] * planeNormalX + input.y[0] * planeNormalY - planeOffset
	const distance1 =
		input.x[1] * planeNormalX + input.y[1] * planeNormalY - planeOffset
	if (distance0 <= 0) {
		keepPoint(input, 0, output)
	}
	if (distance1 <= 0) {
		keepPoint(input, 1, output)
	}
	if (distance0 * distance1 < 0) {
		const fraction = distance0 / (distance0 - distance1)
		const point = output.count++
		output.x[point] = input.x[0] + fraction * (input.x[1] - input.x[0])
		output.y[point] = input.y[0] + fraction * (input.y[1] - input.y[0])
		output.end[point] = distance0 > 0 ? input.end[0] : input.end[1]
	}
}

function keepPoint(
	input: ClippedSegment,
	index: number,
	output: ClippedSegment,
): void {
	const point = output.count++
	output.x[point] = input.x[index]
	output.y[point] = input.y[index]
	output.end[point] = input.end[index]
}

function clipContacts(
	referenceVertices: Float64Array,
	referenceNormals: Float64Array,
	referenceEdge: number,
	incidentVertices: Float64Array,
	incidentNormals: Float64Array,
	flip: boolean,
	out: ContactManifold,
): boolean {
	const referenceLength = referenceVertices.length
	const normalX = referenceNormals[referenceEdge]
	const normalY = referenceNormals[referenceEdge + 1]
	const startX = referenceVertices[referenceEdge]
	const startY = referenceVertices[referenceEdge + 1]
	const endOffset = (referenceEdge + 2) % referenceLength
	const endX = referenceVertices[endOffset]
	const endY = referenceVertices[endOffset + 1]
	const tangentX = -normalY
	const tangentY = normalX

	const incidentEdge = incidentEdgeOffset(incidentNormals, normalX, normalY)
	const incidentEnd = (incidentEdge + 2) % incidentVertices.length
	incidentSegment.count = 2
	incidentSegment.x[0] = incidentVertices[incidentEdge]
	incidentSegment.y[0] = incidentVertices[incidentEdge + 1]
	incidentSegment.end[0] = FIRST_END
	incidentSegment.x[1] = incidentVertices[incidentEnd]
	incidentSegment.y[1] = incidentVertices[incidentEnd + 1]
	incidentSegment.end[1] = SECOND_END

	clipToPlane(
		incidentSegment,
		-tangentX,
		-tangentY,
		-(startX * tangentX + startY * tangentY),
		sideClipped,
	)
	if (sideClipped.count < 2) {
		return false
	}
	clipToPlane(
		sideClipped,
		tangentX,
		tangentY,
		endX * tangentX + endY * tangentY,
		fullyClipped,
	)
	if (fullyClipped.count < 2) {
		return false
	}

	const featureBase =
		((flip ? 1 : 0) << FLIP_SHIFT) |
		((referenceEdge / 2) << REFERENCE_EDGE_SHIFT) |
		((incidentEdge / 2) << INCIDENT_EDGE_SHIFT)
	out.setNormal(flip ? -normalX : normalX, flip ? -normalY : normalY)
	for (let point = 0; point < fullyClipped.count; point++) {
		const pointX = fullyClipped.x[point]
		const pointY = fullyClipped.y[point]
		const separation = (pointX - startX) * normalX + (pointY - startY) * normalY
		if (separation < 0) {
			out.addPoint(
				pointX,
				pointY,
				-separation,
				featureBase | fullyClipped.end[point],
			)
		}
	}
	return out.pointCount > 0
}

function circleVsPolygon(
	centerX: number,
	centerY: number,
	radius: number,
	vertices: Float64Array,
	normals: Float64Array,
	out: ContactManifold,
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
	out: ContactManifold,
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
	out.setNormal(-normalX, -normalY)
	out.addPoint(
		centerX - normalX * radius,
		centerY - normalY * radius,
		-separation,
		nearestOffset / 2,
	)
	return true
}

function circleVsPolygonCorners(
	centerX: number,
	centerY: number,
	radius: number,
	vertices: Float64Array,
	out: ContactManifold,
): boolean {
	for (let offset = 0; offset < vertices.length; offset += 2) {
		const toCornerX = vertices[offset] - centerX
		const toCornerY = vertices[offset + 1] - centerY
		const distanceSquared = toCornerX * toCornerX + toCornerY * toCornerY
		if (distanceSquared < radius * radius) {
			const distance = Math.sqrt(distanceSquared)
			const normalX = distance > 0 ? toCornerX / distance : 1
			const normalY = distance > 0 ? toCornerY / distance : 0
			out.setNormal(normalX, normalY)
			out.addPoint(
				vertices[offset],
				vertices[offset + 1],
				radius - distance,
				CORNER_FEATURE_OFFSET + offset / 2,
			)
			return true
		}
	}
	return false
}

export { testCollision }
