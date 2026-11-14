import type { FieldValues } from "@/ecs/defineComponent"
import { MathHelper } from "@/utils/MathHelper"
import type { Vector2 } from "@/Vector2"
import type { ColliderSchema } from "./colliderGeometry"

const ColliderKind = { CIRCLE: 0, POLYGON: 1 } as const

type ColliderKindValue = (typeof ColliderKind)[keyof typeof ColliderKind]

interface RectangleSize {
	readonly width: number
	readonly height: number
}

interface ColliderShape {
	readonly kind: ColliderKindValue
	readonly radius: number
	readonly localVertices: Float64Array
	readonly centroidX: number
	readonly centroidY: number
	readonly rectangle?: RectangleSize
}

function createCircleShape(radius: number): ColliderShape {
	return {
		kind: ColliderKind.CIRCLE,
		radius,
		localVertices: new Float64Array(0),
		centroidX: 0,
		centroidY: 0,
	}
}

function createRectangleShape(width: number, height: number): ColliderShape {
	const halfWidth = width / 2
	const halfHeight = height / 2
	return {
		kind: ColliderKind.POLYGON,
		radius: 0,
		localVertices: Float64Array.of(
			-halfWidth,
			-halfHeight,
			halfWidth,
			-halfHeight,
			halfWidth,
			halfHeight,
			-halfWidth,
			halfHeight,
		),
		centroidX: 0,
		centroidY: 0,
		rectangle: { width, height },
	}
}

function createPolygonShape(vertices: Vector2[]): ColliderShape {
	const centroid = MathHelper.calcCentroid(vertices)
	const localVertices = new Float64Array(vertices.length * 2)
	vertices.forEach((vertex, index) => {
		localVertices[index * 2] = vertex.x - centroid.x
		localVertices[index * 2 + 1] = vertex.y - centroid.y
	})
	return {
		kind: ColliderKind.POLYGON,
		radius: 0,
		localVertices,
		centroidX: centroid.x,
		centroidY: centroid.y,
	}
}

function circleInertia(mass: number, radius: number): number {
	return mass * radius * radius * 0.5
}

function rectangleInertia(mass: number, width: number, height: number): number {
	return (mass * (width * width + height * height)) / 12
}

function polygonInertia(mass: number, localVertices: Float64Array): number {
	const vertexCount = localVertices.length / 2
	const massPerTriangle = mass / vertexCount
	let inertia = 0
	for (let index = 0; index < vertexCount; index++) {
		const nextIndex = MathHelper.wrapIndex(index + 1, vertexCount)
		const ax = localVertices[index * 2]
		const ay = localVertices[index * 2 + 1]
		const bx = localVertices[nextIndex * 2]
		const by = localVertices[nextIndex * 2 + 1]
		inertia +=
			(massPerTriangle *
				(ax * ax + ay * ay + (bx * bx + by * by) + (ax * bx + ay * by))) /
			6
	}
	return inertia
}

function shapeInertia(shape: ColliderShape, mass: number): number {
	if (shape.kind === ColliderKind.CIRCLE) {
		return circleInertia(mass, shape.radius)
	}
	if (shape.rectangle !== undefined) {
		return rectangleInertia(mass, shape.rectangle.width, shape.rectangle.height)
	}
	return polygonInertia(mass, shape.localVertices)
}

type ColliderValues = Pick<
	FieldValues<ColliderSchema>,
	"kind" | "radius" | "localVertices" | "worldVertices" | "worldNormals"
>

function colliderValues(shape: ColliderShape): ColliderValues {
	return {
		kind: shape.kind,
		radius: shape.radius,
		localVertices: shape.localVertices,
		worldVertices: new Float64Array(shape.localVertices.length),
		worldNormals: new Float64Array(shape.localVertices.length),
	}
}

export type { ColliderKindValue, ColliderShape, ColliderValues, RectangleSize }
export {
	ColliderKind,
	createCircleShape,
	createRectangleShape,
	createPolygonShape,
	circleInertia,
	rectangleInertia,
	polygonInertia,
	shapeInertia,
	colliderValues,
}
