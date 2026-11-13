import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Collider } from "@/components/Collider"
import { Transform } from "@/components/Transform"
import { spawnRigidBody } from "@/components/bodyFactories"
import { Contact } from "@/collisionDetectionSystem/Contact"
import { testCollision } from "@/collisionDetectionSystem/narrowPhase"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"

function collide(world: World, entityA: Entity, entityB: Entity, out: Contact) {
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
	contact: Contact,
	depth: number,
	normalX: number,
	normalY: number,
) {
	expect(contact.depth).toBeCloseTo(depth, 9)
	expect(contact.normalX).toBeCloseTo(normalX, 9)
	expect(contact.normalY).toBeCloseTo(normalY, 9)
}

describe("narrow phase", () => {
	test("circles overlapping along x", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 15, 0, 1)
		const contact = new Contact()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 5, 1, 0)
		expect(contact.pointX).toBeCloseTo(10)
		expect(contact.pointY).toBeCloseTo(0)
	})

	test("separated circles miss", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 25, 0, 1)
		expect(collide(world, a, b, new Contact())).toBe(false)
	})

	test("coincident circles give a finite normal", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 4, 4, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 4, 4, 1)
		const contact = new Contact()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 20, 1, 0)
	})

	test("boxes overlapping along x", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 15, 0, 1)
		const contact = new Contact()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 5, 1, 0)
	})

	test("box below box gives a downward normal", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 0, 15, 1)
		const contact = new Contact()
		expect(collide(world, a, b, contact)).toBe(true)
		expectContact(contact, 5, 0, 1)
	})

	test("separated boxes miss", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 30, 0, 1)
		expect(collide(world, a, b, new Contact())).toBe(false)
	})

	test("circle resting into box top edge", () => {
		const world = new World()
		const circle = spawnRigidBody(world, createCircleShape(10), 0, -14, 1)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const contact = new Contact()
		expect(collide(world, circle, box, contact)).toBe(true)
		expectContact(contact, 6, 0, 1)
		expect(contact.pointY).toBeCloseTo(-4)
	})

	test("box against circle gives the same contact with the normal flipped", () => {
		const world = new World()
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const circle = spawnRigidBody(world, createCircleShape(10), 0, -14, 1)
		const contact = new Contact()
		expect(collide(world, box, circle, contact)).toBe(true)
		expectContact(contact, 6, 0, -1)
		expect(contact.pointY).toBeCloseTo(-4)
	})

	test("circle on box corner", () => {
		const world = new World()
		const circle = spawnRigidBody(world, createCircleShape(10), -16, -16, 1)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const contact = new Contact()
		expect(collide(world, circle, box, contact)).toBe(true)
		expectContact(contact, 10 - Math.hypot(6, 6), Math.SQRT1_2, Math.SQRT1_2)
		expect(contact.pointX).toBe(-10)
		expect(contact.pointY).toBe(-10)
	})

	test("circle clear of a box misses", () => {
		const world = new World()
		const circle = spawnRigidBody(world, createCircleShape(10), 0, -30, 1)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		expect(collide(world, circle, box, new Contact())).toBe(false)
	})
})
