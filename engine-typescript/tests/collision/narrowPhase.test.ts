import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Collider } from "@/components/Collider"
import { Transform } from "@/components/Transform"
import { spawnRigidBody } from "@/components/bodyFactories"
import { ContactManifold } from "@/collisionDetectionSystem/ContactManifold"
import { testCollision } from "@/collisionDetectionSystem/narrowPhase"
import { transformCollider } from "@/shapes/colliderGeometry"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"

function collide(
	world: World,
	entityA: Entity,
	entityB: Entity,
	out: ContactManifold,
) {
	const colliders = world.store(Collider)
	const transforms = world.store(Transform)
	const transformA = transforms.slotOf(entityA)
	const transformB = transforms.slotOf(entityB)
	return testCollision(
		colliders.columns,
		colliders.slotOf(entityA),
		colliders.slotOf(entityB),
		transforms.columns.x[transformA],
		transforms.columns.y[transformA],
		transforms.columns.x[transformB],
		transforms.columns.y[transformB],
		out,
	)
}

function expectContact(
	contact: ContactManifold,
	depth: number,
	normalX: number,
	normalY: number,
) {
	expect(contact.depth[0]).toBeCloseTo(depth, 9)
	expect(contact.normalX).toBeCloseTo(normalX, 9)
	expect(contact.normalY).toBeCloseTo(normalY, 9)
}

describe("narrow phase", () => {
	test("circles overlapping along x", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 15, 0, 1)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 5, 1, 0)
		expect(contact.pointX[0]).toBeCloseTo(10)
		expect(contact.pointY[0]).toBeCloseTo(0)
	})

	test("separated circles miss", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 25, 0, 1)
		expect(collide(world, a, b, new ContactManifold())).toBe(false)
	})

	test("coincident circles give a finite normal", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 4, 4, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 4, 4, 1)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 20, 1, 0)
	})

	test("boxes overlapping along x", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 15, 0, 1)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 5, 1, 0)
	})

	test("box below box gives a downward normal", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 0, 15, 1)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 5, 0, 1)
	})

	test("separated boxes miss", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 30, 0, 1)
		expect(collide(world, a, b, new ContactManifold())).toBe(false)
	})

	test("circle resting into box top edge", () => {
		const world = new World()
		const circle = spawnRigidBody(world, createCircleShape(10), 0, -14, 1)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const contact = new ContactManifold()
		expect(collide(world, circle, box, contact)).toBe(true)
		expectContact(contact, 6, 0, 1)
		expect(contact.pointY[0]).toBeCloseTo(-4)
	})

	test("box against circle gives the same contact with the normal flipped", () => {
		const world = new World()
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const circle = spawnRigidBody(world, createCircleShape(10), 0, -14, 1)
		const contact = new ContactManifold()
		expect(collide(world, box, circle, contact)).toBe(true)
		expectContact(contact, 6, 0, -1)
		expect(contact.pointY[0]).toBeCloseTo(-4)
	})

	test("circle on box corner", () => {
		const world = new World()
		const circle = spawnRigidBody(world, createCircleShape(10), -16, -16, 1)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const contact = new ContactManifold()
		expect(collide(world, circle, box, contact)).toBe(true)
		expectContact(contact, 10 - Math.hypot(6, 6), Math.SQRT1_2, Math.SQRT1_2)
		expect(contact.pointX[0]).toBe(-10)
		expect(contact.pointY[0]).toBe(-10)
	})

	test("circle clear of a box misses", () => {
		const world = new World()
		const circle = spawnRigidBody(world, createCircleShape(10), 0, -30, 1)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		expect(collide(world, circle, box, new ContactManifold())).toBe(false)
	})
})

function placeBody(
	world: World,
	entity: Entity,
	x: number,
	y: number,
	angle: number,
): void {
	const transforms = world.store(Transform)
	const colliders = world.store(Collider)
	const transformSlot = transforms.slotOf(entity)
	transforms.columns.x[transformSlot] = x
	transforms.columns.y[transformSlot] = y
	transforms.columns.angle[transformSlot] = angle
	transformCollider(
		colliders.columns,
		colliders.slotOf(entity),
		x,
		y,
		angle,
		true,
	)
}

function sortedPointXs(contact: ContactManifold): number[] {
	return Array.from(contact.pointX.slice(0, contact.pointCount)).sort(
		(left, right) => left - right,
	)
}

describe("contact manifolds", () => {
	test("circle contacts have one point", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 15, 0, 1)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 30, 1)
		const circle = spawnRigidBody(world, createCircleShape(10), 0, 16, 1)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expect(contact.pointCount).toBe(1)
		expect(collide(world, circle, box, contact)).toBe(true)
		expect(contact.pointCount).toBe(1)
	})

	test("a box resting flat on a box has two points", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 0, 15, 1)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expect(contact.pointCount).toBe(2)
		expect(contact.normalX).toBeCloseTo(0, 9)
		expect(contact.normalY).toBeCloseTo(1, 9)
		expect(contact.depth[0]).toBeCloseTo(5, 9)
		expect(contact.depth[1]).toBeCloseTo(5, 9)
		const [left, right] = sortedPointXs(contact)
		expect(left).toBeCloseTo(-10, 9)
		expect(right).toBeCloseTo(10, 9)
	})

	test("an offset box is clipped to the overlap", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 6, 15, 1)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expect(contact.pointCount).toBe(2)
		const [left, right] = sortedPointXs(contact)
		expect(left).toBeCloseTo(-4, 9)
		expect(right).toBeCloseTo(10, 9)
	})

	test("a tilted box touching on one corner has one point", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const reach = 10 * Math.cos(0.3) + 10 * Math.sin(0.3)
		placeBody(world, b, 0, 10 + reach - 2, 0.3)
		const contact = new ContactManifold()
		expect(collide(world, a, b, contact)).toBe(true)
		expect(contact.pointCount).toBe(1)
		expect(contact.depth[0]).toBeCloseTo(2, 6)
		expect(contact.normalY).toBeCloseTo(1, 9)
	})

	test("feature ids are distinct and stable under small moves", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 0, 15, 1)
		const contact = new ContactManifold()
		collide(world, a, b, contact)
		const before = [contact.featureId[0], contact.featureId[1]]
		expect(before[0]).not.toBe(before[1])
		placeBody(world, b, 0.1, 15, 0)
		collide(world, a, b, contact)
		expect([contact.featureId[0], contact.featureId[1]]).toEqual(before)
	})
})
