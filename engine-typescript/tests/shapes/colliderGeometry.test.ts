import { describe, expect, test } from "vitest"
import { ComponentStore } from "@/ecs/ComponentStore"
import { defineComponent } from "@/ecs/defineComponent"
import { packEntity } from "@/ecs/Entity"
import {
	COLLIDER_SCHEMA,
	aabbOverlap,
	isPointInsideCollider,
	transformCollider,
	translateCollider,
} from "@/shapes/colliderGeometry"
import {
	colliderValues,
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"
import type { ColliderShape } from "@/shapes/colliderShapes"

const TestCollider = defineComponent("TestCollider", COLLIDER_SCHEMA)

function placed(
	store: ComponentStore<typeof COLLIDER_SCHEMA>,
	index: number,
	shape: ColliderShape,
	x: number,
	y: number,
	angle = 0,
): number {
	const slot = store.add(packEntity(index, 0), colliderValues(shape))
	transformCollider(store.columns, slot, x, y, angle, true)
	return slot
}

describe("collider geometry", () => {
	test("transform rotates and translates vertices and normals", () => {
		const store = new ComponentStore(TestCollider)
		const slot = placed(
			store,
			0,
			createRectangleShape(40, 20),
			100,
			50,
			Math.PI / 2,
		)
		const vertices = store.columns.worldVertices[slot]!
		const normals = store.columns.worldNormals[slot]!
		expect(vertices[0]).toBeCloseTo(110, 9)
		expect(vertices[1]).toBeCloseTo(30, 9)
		expect(normals[0]).toBeCloseTo(1, 9)
		expect(normals[1]).toBeCloseTo(0, 9)
		expect(store.columns.minX[slot]).toBeCloseTo(90, 9)
		expect(store.columns.maxX[slot]).toBeCloseTo(110, 9)
		expect(store.columns.minY[slot]).toBeCloseTo(30, 9)
		expect(store.columns.maxY[slot]).toBeCloseTo(70, 9)
	})

	test("unrotated rectangle normals point outward", () => {
		const store = new ComponentStore(TestCollider)
		const slot = placed(store, 0, createRectangleShape(40, 20), 0, 0)
		expect(Array.from(store.columns.worldNormals[slot]!)).toEqual([
			0, -1, 1, -0, 0, 1, -1, -0,
		])
	})

	test("circle bounds are centre plus and minus radius", () => {
		const store = new ComponentStore(TestCollider)
		const slot = placed(store, 0, createCircleShape(10), 5, 7)
		expect(store.columns.minX[slot]).toBe(-5)
		expect(store.columns.maxY[slot]).toBe(17)
	})

	test("translate shifts vertices and bounds", () => {
		const store = new ComponentStore(TestCollider)
		const slot = placed(store, 0, createRectangleShape(40, 20), 0, 0)
		translateCollider(store.columns, slot, 3, -4)
		expect(store.columns.worldVertices[slot]![0]).toBe(-17)
		expect(store.columns.worldVertices[slot]![1]).toBe(-14)
		expect(store.columns.minX[slot]).toBe(-17)
		expect(store.columns.maxY[slot]).toBe(6)
	})

	test("point inside polygon and circle", () => {
		const store = new ComponentStore(TestCollider)
		const box = placed(store, 0, createRectangleShape(40, 20), 0, 0)
		const circle = placed(store, 1, createCircleShape(10), 100, 0)
		expect(isPointInsideCollider(store.columns, box, 0, 0, 5, 5)).toBe(true)
		expect(isPointInsideCollider(store.columns, box, 0, 0, 25, 0)).toBe(false)
		expect(isPointInsideCollider(store.columns, circle, 100, 0, 105, 0)).toBe(
			true,
		)
		expect(isPointInsideCollider(store.columns, circle, 100, 0, 111, 0)).toBe(
			false,
		)
	})

	test("aabb overlap uses strict inequalities", () => {
		const store = new ComponentStore(TestCollider)
		const left = placed(store, 0, createRectangleShape(20, 20), 0, 0)
		const touching = placed(store, 1, createRectangleShape(20, 20), 20, 0)
		const overlapping = placed(store, 2, createRectangleShape(20, 20), 15, 5)
		expect(aabbOverlap(store.columns, left, touching)).toBe(false)
		expect(aabbOverlap(store.columns, left, overlapping)).toBe(true)
	})
})
