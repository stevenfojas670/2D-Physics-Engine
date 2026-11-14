import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Schedule } from "@/ecs/Schedule"
import { Collider } from "@/components/Collider"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { MovementIntent } from "@/components/MovementIntent"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import {
	spawnParticle,
	spawnRigidBody,
	spawnStaticBody,
} from "@/components/bodyFactories"
import { GravityResource } from "@/resources/Gravity"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { createColliderTransformSystem } from "@/systems/ColliderTransformSystem"
import { createGravitySystem } from "@/systems/GravitySystem"
import { createIntentForceSystem } from "@/systems/IntentForceSystem"
import { createParticleIntegrationSystem } from "@/systems/ParticleIntegrationSystem"
import { createRigidBodyIntegrationSystem } from "@/systems/RigidBodyIntegrationSystem"

function worldWithGravity(): World {
	const world = new World()
	world.setResource(GravityResource, { x: 0, y: 200 })
	return world
}

function velocityOf(world: World, entity: Entity): [number, number] {
	const velocities = world.store(Velocity)
	const slot = velocities.slotOf(entity)
	return [velocities.columns.x[slot], velocities.columns.y[slot]]
}

function positionOf(world: World, entity: Entity): [number, number] {
	const transforms = world.store(Transform)
	const slot = transforms.slotOf(entity)
	return [transforms.columns.x[slot], transforms.columns.y[slot]]
}

describe("rigid-body integration", () => {
	test("free body under gravity follows semi-implicit Euler with damping", () => {
		const world = worldWithGravity()
		const body = spawnRigidBody(world, createRectangleShape(10, 10), 0, 100, 2)
		const schedule = new Schedule()
			.add(createGravitySystem(world))
			.add(createRigidBodyIntegrationSystem(world))
		schedule.run(world, 0.1)
		expect(velocityOf(world, body)[1]).toBeCloseTo(19.98, 9)
		expect(positionOf(world, body)[1]).toBeCloseTo(102, 9)
		const forces = world.store(ForceAccumulator)
		expect(forces.columns.y[forces.slotOf(body)]).toBe(0)
	})

	test("slow body is put to sleep", () => {
		const world = new World()
		const body = spawnRigidBody(world, createRectangleShape(10, 10), 0, 0, 1)
		world.add(body, Velocity, { x: 0.005, y: 0, angular: 0.005 })
		createRigidBodyIntegrationSystem(world)(0.016)
		expect(velocityOf(world, body)).toEqual([0, 0])
		const velocities = world.store(Velocity)
		expect(velocities.columns.angular[velocities.slotOf(body)]).toBe(0)
	})

	test("torque spins the body", () => {
		const world = new World()
		const body = spawnRigidBody(world, createRectangleShape(10, 10), 0, 0, 1)
		world.add(body, ForceAccumulator, { torque: 100 })
		createRigidBodyIntegrationSystem(world)(0.1)
		const transforms = world.store(Transform)
		expect(transforms.columns.angle[transforms.slotOf(body)]).toBeGreaterThan(0)
	})

	test("immovable bodies do not move", () => {
		const world = worldWithGravity()
		const wall = spawnStaticBody(world, createRectangleShape(10, 10), 5, 5)
		const schedule = new Schedule()
			.add(createGravitySystem(world))
			.add(createRigidBodyIntegrationSystem(world))
		schedule.run(world, 0.1)
		expect(positionOf(world, wall)).toEqual([5, 5])
	})
})

describe("intent forces", () => {
	test("intent moves the player", () => {
		const world = new World()
		const player = spawnRigidBody(world, createRectangleShape(40, 40), 0, 0, 1)
		world.add(player, MovementIntent, { x: 1, y: 0, jump: 0 })
		createIntentForceSystem(world)(0.016)
		const forces = world.store(ForceAccumulator)
		expect(forces.columns.x[forces.slotOf(player)]).toBe(500)
		expect(forces.columns.y[forces.slotOf(player)]).toBe(0)
	})

	test("jump adds ten times the upward force", () => {
		const world = new World()
		const player = spawnRigidBody(world, createRectangleShape(40, 40), 0, 0, 1)
		world.add(player, MovementIntent, { x: 0, y: -1, jump: 1 })
		createIntentForceSystem(world)(0.016)
		const forces = world.store(ForceAccumulator)
		expect(forces.columns.y[forces.slotOf(player)]).toBe(-500 - 5000)
	})
})

describe("particle integration", () => {
	test("particle keeps velocity with no damping", () => {
		const world = new World()
		const particle = spawnParticle(world, 0, 0, 1)
		world.add(particle, Velocity, { x: 100, y: 0 })
		const system = createParticleIntegrationSystem(world)
		system(1 / 60)
		system(1 / 60)
		expect(velocityOf(world, particle)).toEqual([100, 0])
	})

	test("particle force applies for one step only", () => {
		const world = new World()
		const particle = spawnParticle(world, 0, 0, 2)
		world.add(particle, ForceAccumulator, { x: 10, y: 0 })
		const system = createParticleIntegrationSystem(world)
		system(1)
		system(1)
		expect(velocityOf(world, particle)[0]).toBe(5)
	})

	test("particle damping is frame-rate independent", () => {
		const world = new World()
		const particle = spawnParticle(world, 0, 0, 1, { damping: 0.5 })
		world.add(particle, Velocity, { x: 100, y: 0 })
		const system = createParticleIntegrationSystem(world)
		system(0.5)
		system(0.5)
		expect(velocityOf(world, particle)[0]).toBeCloseTo(50, 9)
	})

	test("rigid-body integration skips particles", () => {
		const world = new World()
		const particle = spawnParticle(world, 0, 0, 1, { damping: 1 })
		world.add(particle, Velocity, { x: 0.001, y: 0 })
		createRigidBodyIntegrationSystem(world)(1)
		expect(velocityOf(world, particle)[0]).toBe(0.001)
	})
})

describe("collider transform", () => {
	test("collider follows its transform", () => {
		const world = new World()
		const body = spawnRigidBody(world, createRectangleShape(40, 20), 0, 0, 1)
		const transforms = world.store(Transform)
		const slot = transforms.slotOf(body)
		transforms.columns.x[slot] = 100
		transforms.columns.angle[slot] = Math.PI / 2
		const colliders = world.store(Collider)
		colliders.columns.touching[colliders.slotOf(body)] = 1
		createColliderTransformSystem(world)(0)
		const colliderSlot = colliders.slotOf(body)
		expect(colliders.columns.minX[colliderSlot]).toBeCloseTo(90, 9)
		expect(colliders.columns.worldNormals[colliderSlot]![0]).toBeCloseTo(1, 9)
		expect(colliders.columns.touching[colliderSlot]).toBe(0)
	})
})
