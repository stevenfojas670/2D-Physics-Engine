import { describe, expect, test } from "vitest"
import type { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Schedule } from "@/ecs/Schedule"
import { Collider } from "@/components/Collider"
import { Material } from "@/components/Material"
import { Velocity } from "@/components/Velocity"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { DEFAULT_FRICTION } from "@/materials/materialDefaults"
import { ContactsResource } from "@/resources/ContactLog"
import {
	ContactManifoldsResource,
	MAX_MANIFOLD_POINTS,
} from "@/resources/ContactManifolds"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { createBroadPhaseSystem } from "@/systems/BroadPhaseSystem"
import { createContactDetectionSystem } from "@/systems/ContactDetectionSystem"
import { physicsWorld } from "./physicsWorld"

const STEP = 1 / 60

function detectionSchedule(world: World): Schedule {
	return new Schedule()
		.add("broadPhase", createBroadPhaseSystem(world))
		.add("contactDetection", createContactDetectionSystem(world))
}

function boxOnFloor(world: World): { floor: Entity; box: Entity } {
	const floor = spawnStaticBody(world, createRectangleShape(400, 20), 0, 100)
	const box = spawnRigidBody(world, createRectangleShape(20, 20), 0, 81, 1)
	return { floor, box }
}

function isTouching(world: World, entity: Entity): boolean {
	const colliders = world.store(Collider)
	return colliders.columns.touching[colliders.slotOf(entity)] === 1
}

function setMaterial(
	world: World,
	entity: Entity,
	restitution: number,
	friction: number,
): void {
	world.add(entity, Material, { restitution, friction })
}

describe("contact detection", () => {
	test("a box resting flat on the floor gives one two-point manifold", () => {
		const world = physicsWorld(0, 0)
		boxOnFloor(world)
		detectionSchedule(world).run(world, STEP)
		const manifolds = world.resource(ContactManifoldsResource)
		expect(manifolds.count).toBe(1)
		expect(manifolds.columns.pointCount[0]).toBe(2)
		expect(manifolds.columns.depth[0]).toBeCloseTo(1, 9)
		expect(world.resource(ContactsResource).contactCount).toBe(2)
	})

	test("anchors are measured from each body's centre", () => {
		const world = physicsWorld(0, 0)
		const { box } = boxOnFloor(world)
		detectionSchedule(world).run(world, STEP)
		const columns = world.resource(ContactManifoldsResource).columns
		const boxIsA = columns.entityA[0] === box
		for (let point = 0; point < 2; point++) {
			const anchorY = boxIsA ? columns.anchorAY[point] : columns.anchorBY[point]
			expect(columns.pointY[point] - anchorY).toBeCloseTo(81, 9)
		}
	})

	test("touching marks overlapping bounds and clears the rest", () => {
		const world = physicsWorld(0, 0)
		const { floor, box } = boxOnFloor(world)
		const far = spawnRigidBody(world, createRectangleShape(20, 20), 500, 0, 1)
		const colliders = world.store(Collider)
		colliders.columns.touching[colliders.slotOf(far)] = 1
		detectionSchedule(world).run(world, STEP)
		expect(isTouching(world, floor)).toBe(true)
		expect(isTouching(world, box)).toBe(true)
		expect(isTouching(world, far)).toBe(false)
	})

	test("two overlapping static bodies give no manifold", () => {
		const world = physicsWorld(0, 0)
		spawnStaticBody(world, createRectangleShape(20, 20), 0, 0)
		spawnStaticBody(world, createRectangleShape(20, 20), 10, 0)
		detectionSchedule(world).run(world, STEP)
		expect(world.resource(ContactManifoldsResource).count).toBe(0)
	})

	test("materials combine as max restitution and geometric-mean friction", () => {
		const world = physicsWorld(0, 0)
		const { floor, box } = boxOnFloor(world)
		setMaterial(world, floor, 0.2, 0.4)
		setMaterial(world, box, 0.7, 0.9)
		detectionSchedule(world).run(world, STEP)
		const columns = world.resource(ContactManifoldsResource).columns
		expect(columns.restitution[0]).toBeCloseTo(0.7, 12)
		expect(columns.friction[0]).toBeCloseTo(0.6, 12)
	})

	test("a body without a material combines with the defaults", () => {
		const world = physicsWorld(0, 0)
		const { floor, box } = boxOnFloor(world)
		setMaterial(world, floor, 0, 0.4)
		world.remove(box, Material)
		detectionSchedule(world).run(world, STEP)
		const columns = world.resource(ContactManifoldsResource).columns
		expect(columns.restitution[0]).toBe(0.5)
		expect(columns.friction[0]).toBeCloseTo(
			Math.sqrt(0.4 * DEFAULT_FRICTION),
			12,
		)
	})

	test("a body with mass but no velocity is immovable in its contacts", () => {
		const world = physicsWorld(0, 0)
		const { box: lower } = boxOnFloor(world)
		world.remove(lower, Velocity)
		const upper = spawnRigidBody(world, createRectangleShape(20, 20), 0, 62, 1)
		detectionSchedule(world).run(world, STEP)
		const manifolds = world.resource(ContactManifoldsResource)
		expect(manifolds.count).toBe(1)
		const columns = manifolds.columns
		const lowerIsA = columns.entityA[0] === lower
		expect(lowerIsA || columns.entityB[0] === lower).toBe(true)
		expect(columns.entityA[0] === upper || columns.entityB[0] === upper).toBe(
			true,
		)
		const lowerSlot = lowerIsA ? columns.velocitySlotA : columns.velocitySlotB
		const lowerMass = lowerIsA ? columns.inverseMassA : columns.inverseMassB
		const lowerInertia = lowerIsA
			? columns.inverseInertiaA
			: columns.inverseInertiaB
		expect(lowerSlot[0]).toBe(-1)
		expect(lowerMass[0]).toBe(0)
		expect(lowerInertia[0]).toBe(0)
	})

	test("impulses carry over to the next step", () => {
		const world = physicsWorld(0, 0)
		boxOnFloor(world)
		const schedule = detectionSchedule(world)
		schedule.run(world, STEP)
		const manifolds = world.resource(ContactManifoldsResource)
		manifolds.columns.normalImpulse[0] = 3
		manifolds.columns.normalImpulse[1] = 4
		schedule.run(world, STEP)
		expect(manifolds.columns.normalImpulse[0]).toBe(3)
		expect(manifolds.columns.normalImpulse[1]).toBe(4)
	})

	test("a body reusing a destroyed entity's index starts with no impulse", () => {
		const world = physicsWorld(0, 0)
		const { box } = boxOnFloor(world)
		const schedule = detectionSchedule(world)
		schedule.run(world, STEP)
		const manifolds = world.resource(ContactManifoldsResource)
		manifolds.columns.normalImpulse[0] = 3
		world.destroyEntity(box)
		const replacement = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			0,
			81,
			1,
		)
		expect(replacement).not.toBe(box)
		schedule.run(world, STEP)
		expect(manifolds.count).toBe(1)
		for (let point = 0; point < MAX_MANIFOLD_POINTS; point++) {
			expect(manifolds.columns.normalImpulse[point]).toBe(0)
		}
	})
})
