import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Collider } from "@/components/Collider"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { BodyColumns } from "@/collisionDetectionSystem/BodyColumns"
import { Contact } from "@/collisionDetectionSystem/Contact"
import {
	correctPositions,
	resolveImpulse,
} from "@/collisionDetectionSystem/contactResolution"
import { ContactLog } from "@/resources/ContactLog"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"

function contact(
	depth: number,
	normalX: number,
	normalY: number,
	pointX: number,
	pointY: number,
): Contact {
	const result = new Contact()
	result.set(depth, normalX, normalY, pointX, pointY)
	return result
}

function positionOf(world: World, entity: Entity): [number, number] {
	const transforms = world.store(Transform)
	const slot = transforms.slotOf(entity)
	return [transforms.columns.x[slot], transforms.columns.y[slot]]
}

function velocityOf(world: World, entity: Entity): [number, number] {
	const velocities = world.store(Velocity)
	const slot = velocities.slotOf(entity)
	return [velocities.columns.x[slot], velocities.columns.y[slot]]
}

function setVelocity(world: World, entity: Entity, x: number, y: number) {
	world.add(entity, Velocity, { x, y })
}

describe("positional correction", () => {
	test("overlapping boxes are pushed apart by 90% of depth, split by inverse mass", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 15, 0, 1)
		correctPositions(new BodyColumns(world), a, b, contact(5, 1, 0, 5, 0))
		expect(positionOf(world, a)[0]).toBeCloseTo(-2.25)
		expect(positionOf(world, b)[0]).toBeCloseTo(17.25)
	})

	test("correction moves the collider with the transform", () => {
		const world = new World()
		const a = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const b = spawnRigidBody(world, createRectangleShape(20, 20), 15, 0, 1)
		correctPositions(new BodyColumns(world), a, b, contact(5, 1, 0, 5, 0))
		const colliders = world.store(Collider)
		expect(colliders.columns.minX[colliders.slotOf(b)]).toBeCloseTo(7.25)
		expect(
			colliders.columns.worldVertices[colliders.slotOf(b)]![0],
		).toBeCloseTo(7.25)
	})

	test("immovable side never moves", () => {
		const world = new World()
		const wall = spawnStaticBody(world, createRectangleShape(20, 20), 0, 0)
		const box = spawnRigidBody(world, createRectangleShape(20, 20), 15, 0, 1)
		correctPositions(new BodyColumns(world), wall, box, contact(5, 1, 0, 5, 0))
		expect(positionOf(world, wall)).toEqual([0, 0])
		expect(positionOf(world, box)[0]).toBeCloseTo(19.5)
	})
})

describe("impulse resolution", () => {
	test("head-on circles swap momentum with restitution 0.5", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 19, 0, 1)
		setVelocity(world, a, 10, 0)
		setVelocity(world, b, -10, 0)
		resolveImpulse(new BodyColumns(world), a, b, contact(1, 1, 0, 9.5, 0), null)
		expect(velocityOf(world, a)[0]).toBeCloseTo(-5)
		expect(velocityOf(world, b)[0]).toBeCloseTo(5)
	})

	test("separating bodies are left alone", () => {
		const world = new World()
		const a = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const b = spawnRigidBody(world, createCircleShape(10), 19, 0, 1)
		setVelocity(world, a, -10, 0)
		setVelocity(world, b, 10, 0)
		resolveImpulse(new BodyColumns(world), a, b, contact(1, 1, 0, 9.5, 0), null)
		expect(velocityOf(world, a)).toEqual([-10, 0])
		expect(velocityOf(world, b)).toEqual([10, 0])
	})

	test("a body hitting an immovable wall bounces back at half speed", () => {
		const world = new World()
		const ball = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const wall = spawnStaticBody(world, createRectangleShape(20, 100), 19, 0)
		setVelocity(world, ball, 10, 0)
		resolveImpulse(
			new BodyColumns(world),
			ball,
			wall,
			contact(1, 1, 0, 9, 0),
			null,
		)
		expect(velocityOf(world, ball)[0]).toBeCloseTo(-5)
		expect(world.has(wall, Velocity)).toBe(false)
	})

	test("friction arrow is recorded when the tangent passes the old check", () => {
		const world = new World()
		const top = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const bottom = spawnStaticBody(world, createRectangleShape(100, 20), 0, 19)
		setVelocity(world, top, 10, 5)
		const log = new ContactLog()
		resolveImpulse(
			new BodyColumns(world),
			top,
			bottom,
			contact(1, 0, 1, 0, 9),
			log,
		)
		expect(log.frictionCount).toBe(1)
		expect(log.frictionArrows.slice(0, 4)).toEqual([0, 0, 40, 0])
		expect(velocityOf(world, top)[0]).toBeLessThan(10)
	})
})
