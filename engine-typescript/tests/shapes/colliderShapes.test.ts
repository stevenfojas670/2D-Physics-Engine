import { describe, expect, test } from "vitest"
import {
	ColliderKind,
	circleInertia,
	colliderValues,
	createCircleShape,
	createPolygonShape,
	createRectangleShape,
	polygonInertia,
	rectangleInertia,
	shapeInertia,
} from "@/shapes/colliderShapes"
import { Vector2 } from "@/Vector2"

describe("collider shapes", () => {
	test("rectangle local vertices are TL TR BR BL around the centroid", () => {
		expect(Array.from(createRectangleShape(40, 20).localVertices)).toEqual([
			-20, -10, 20, -10, 20, 10, -20, 10,
		])
	})

	test("polygon shape is centred on its centroid", () => {
		const shape = createPolygonShape([
			new Vector2(100, 100),
			new Vector2(140, 100),
			new Vector2(140, 120),
			new Vector2(100, 120),
		])
		expect(shape.kind).toBe(ColliderKind.POLYGON)
		expect(shape.centroidX).toBeCloseTo(120)
		expect(shape.centroidY).toBeCloseTo(110)
		expect(Array.from(shape.localVertices)).toEqual([
			-20, -10, 20, -10, 20, 10, -20, 10,
		])
	})

	test("circle shape has a radius and no vertices", () => {
		const shape = createCircleShape(15)
		expect(shape.kind).toBe(ColliderKind.CIRCLE)
		expect(shape.radius).toBe(15)
		expect(shape.localVertices.length).toBe(0)
	})

	test("inertia matches the old formulas", () => {
		expect(rectangleInertia(1, 40, 40)).toBeCloseTo(266.6667, 3)
		expect(circleInertia(10, 50)).toBe(12500)
		expect(
			polygonInertia(1, createRectangleShape(40, 40).localVertices),
		).toBeCloseTo(266.6667, 3)
	})

	test("shapeInertia uses the rectangle formula for rectangles", () => {
		expect(shapeInertia(createRectangleShape(100, 50), 10)).toBeCloseTo(
			(10 * (100 * 100 + 50 * 50)) / 12,
		)
		expect(shapeInertia(createCircleShape(50), 10)).toBe(12500)
	})

	test("colliderValues allocates world arrays matching the local vertices", () => {
		const values = colliderValues(createRectangleShape(40, 20))
		expect(values.kind).toBe(ColliderKind.POLYGON)
		expect(values.worldVertices.length).toBe(8)
		expect(values.worldNormals.length).toBe(8)
	})
})
