import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Schedule } from "@/ecs/Schedule"
import { Collider } from "@/components/Collider"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import { createBroadPhaseGrid } from "@/optimizations/broadPhase/createBroadPhaseGrid"
import { BroadPhaseResource } from "@/resources/BroadPhase"
import { CandidatePairsResource } from "@/resources/CandidatePairs"
import {
	CollisionSettings,
	CollisionSettingsResource,
} from "@/resources/CollisionSettings"
import { ContactLog, ContactsResource } from "@/resources/ContactLog"
import { GravityResource } from "@/resources/Gravity"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { createBroadPhaseSystem } from "@/systems/BroadPhaseSystem"
import { createColliderTransformSystem } from "@/systems/ColliderTransformSystem"
import { createCollisionSolverSystem } from "@/systems/CollisionSolverSystem"
import { createGravitySystem } from "@/systems/GravitySystem"
import { createRigidBodyIntegrationSystem } from "@/systems/RigidBodyIntegrationSystem"

const STEP = 1 / 60

function collisionWorld(gravityY: number): World {
	const world = new World()
	world.setResource(GravityResource, { x: 0, y: gravityY })
	world.setResource(CollisionSettingsResource, new CollisionSettings())
	world.setResource(BroadPhaseResource, createBroadPhaseGrid("hash", 20))
	world.setResource(ContactsResource, new ContactLog())
	return world
}

function physicsSchedule(world: World): Schedule {
	return new Schedule()
		.add(createGravitySystem(world))
		.add(createRigidBodyIntegrationSystem(world))
		.add(createColliderTransformSystem(world))
		.add(createBroadPhaseSystem(world))
		.add(createCollisionSolverSystem(world))
}

function xOf(world: World, entity: Entity): number {
	const transforms = world.store(Transform)
	return transforms.columns.x[transforms.slotOf(entity)]
}

function yOf(world: World, entity: Entity): number {
	const transforms = world.store(Transform)
	return transforms.columns.y[transforms.slotOf(entity)]
}

function isTouching(world: World, entity: Entity): boolean {
	const colliders = world.store(Collider)
	return colliders.columns.touching[colliders.slotOf(entity)] === 1
}

function box(
	world: World,
	x: number,
	y: number,
	group = CollisionGroups.GROUP0,
): Entity {
	return spawnRigidBody(world, createRectangleShape(20, 20), x, y, 1, { group })
}

describe("broad phase and collision solver", () => {
	test("two overlapping boxes end up separated", () => {
		const world = collisionWorld(0)
		const left = box(world, 0, 0)
		const right = box(world, 10, 0)
		physicsSchedule(world).run(world, STEP)
		expect(xOf(world, right) - xOf(world, left)).toBeGreaterThan(19.99)
		expect(xOf(world, left)).toBeLessThan(0)
		expect(xOf(world, right)).toBeGreaterThan(10)
	})

	test("a box resting on the floor stays at rest", () => {
		const world = collisionWorld(200)
		spawnStaticBody(world, createRectangleShape(400, 20), 0, 100)
		const falling = box(world, 0, 40)
		const schedule = physicsSchedule(world)
		const lastHeights: number[] = []
		for (let step = 0; step < 300; step++) {
			schedule.run(world, STEP)
			if (step >= 240) {
				lastHeights.push(yOf(world, falling))
			}
		}
		const velocities = world.store(Velocity)
		expect(
			Math.abs(velocities.columns.y[velocities.slotOf(falling)]),
		).toBeLessThan(1)
		expect(Math.max(...lastHeights) - Math.min(...lastHeights)).toBeLessThan(
			0.5,
		)
		expect(yOf(world, falling)).toBeGreaterThan(75)
		expect(yOf(world, falling)).toBeLessThan(81)
	})

	test("disabled groups do not collide", () => {
		const world = collisionWorld(0)
		world
			.resource(CollisionSettingsResource)
			.disableCollision(CollisionGroups.GROUP1, CollisionGroups.GROUP2)
		const left = box(world, 0, 0, CollisionGroups.GROUP1)
		const right = box(world, 10, 0, CollisionGroups.GROUP2)
		physicsSchedule(world).run(world, STEP)
		expect(world.resource(CandidatePairsResource).count).toBe(0)
		expect(xOf(world, left)).toBe(0)
		expect(xOf(world, right)).toBe(10)
		expect(isTouching(world, left)).toBe(false)
	})

	test("collision matrices of two worlds are independent", () => {
		const blocked = collisionWorld(0)
		const open = collisionWorld(0)
		blocked
			.resource(CollisionSettingsResource)
			.disableCollision(CollisionGroups.GROUP1, CollisionGroups.GROUP2)
		const blockedRight = box(blocked, 10, 0, CollisionGroups.GROUP2)
		box(blocked, 0, 0, CollisionGroups.GROUP1)
		const openRight = box(open, 10, 0, CollisionGroups.GROUP2)
		box(open, 0, 0, CollisionGroups.GROUP1)
		physicsSchedule(blocked).run(blocked, STEP)
		physicsSchedule(open).run(open, STEP)
		expect(xOf(blocked, blockedRight)).toBe(10)
		expect(xOf(open, openRight)).toBeGreaterThan(10)
	})

	test("each pair is solved once per iteration", () => {
		const world = collisionWorld(0)
		box(world, 10, 10)
		box(world, 15, 15)
		createBroadPhaseSystem(world)(STEP)
		expect(world.resource(CandidatePairsResource).count).toBe(1)
	})

	test("pairs are found again on the next step", () => {
		const world = collisionWorld(0)
		box(world, 10, 10)
		box(world, 15, 15)
		const broadPhase = createBroadPhaseSystem(world)
		broadPhase(STEP)
		broadPhase(STEP)
		expect(world.resource(CandidatePairsResource).count).toBe(1)
	})

	test("touching marks overlapping bounding boxes", () => {
		const world = collisionWorld(0)
		const left = box(world, 0, 0)
		const right = box(world, 10, 0)
		const far = box(world, 200, 0)
		physicsSchedule(world).run(world, STEP)
		expect(isTouching(world, left)).toBe(true)
		expect(isTouching(world, right)).toBe(true)
		expect(isTouching(world, far)).toBe(false)
	})

	test("contacts are cleared at the start of each step", () => {
		const world = collisionWorld(0)
		box(world, 0, 0)
		box(world, 100, 0)
		world.resource(ContactsResource).recordContact(1, 2, 3, 4, 5)
		physicsSchedule(world).run(world, STEP)
		expect(world.resource(ContactsResource).contactCount).toBe(0)
	})

	test("a resting box records its floor contact once per step", () => {
		const world = collisionWorld(200)
		spawnStaticBody(world, createRectangleShape(400, 20), 0, 100)
		box(world, 0, 79)
		const schedule = physicsSchedule(world)
		for (let step = 0; step < 60; step++) {
			schedule.run(world, STEP)
		}
		const contacts = world.resource(ContactsResource)
		expect(contacts.contactCount).toBeGreaterThanOrEqual(1)
		expect(contacts.contactCount).toBeLessThanOrEqual(2)
	})
})
