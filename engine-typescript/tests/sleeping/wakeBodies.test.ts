import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Asleep } from "@/components/Asleep"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { SleepTimer } from "@/components/SleepTimer"
import { Velocity } from "@/components/Velocity"
import { spawnRigidBody } from "@/components/bodyFactories"
import { SleepingIslandsResource } from "@/resources/SleepingIslands"
import { createRectangleShape } from "@/shapes/colliderShapes"
import {
	fallAsleep,
	installSleepResources,
	wakeAllBodies,
	wakeBodiesOverlapping,
	wakeBody,
} from "@/sleeping/wakeBodies"

function sleepWorld(): World {
	const world = new World()
	installSleepResources(world)
	return world
}

function box(world: World, x: number): Entity {
	return spawnRigidBody(world, createRectangleShape(10, 10), x, 0, 1)
}

function sleepTimeOf(world: World, entity: Entity): number {
	const timers = world.store(SleepTimer)
	return timers.columns.sleepTime[timers.slotOf(entity)]
}

function setSleepTime(world: World, entity: Entity, seconds: number): void {
	const timers = world.store(SleepTimer)
	timers.columns.sleepTime[timers.slotOf(entity)] = seconds
}

function islandCount(world: World): number {
	return world.resource(SleepingIslandsResource).count
}

describe("wake helpers", () => {
	test("fallAsleep zeroes motion and tags the group", () => {
		const world = sleepWorld()
		const first = box(world, 0)
		const second = box(world, 50)
		world.add(first, Velocity, { x: 5, y: 3, angular: 1 })
		world.add(second, ForceAccumulator, { x: 7, y: 2, torque: 4 })
		fallAsleep(world, [first, second])
		world.flushDeferred()
		const velocities = world.store(Velocity)
		const forces = world.store(ForceAccumulator)
		for (const body of [first, second]) {
			expect(world.has(body, Asleep)).toBe(true)
			const velocitySlot = velocities.slotOf(body)
			expect(velocities.columns.x[velocitySlot]).toBe(0)
			expect(velocities.columns.y[velocitySlot]).toBe(0)
			expect(velocities.columns.angular[velocitySlot]).toBe(0)
			const forceSlot = forces.slotOf(body)
			expect(forces.columns.x[forceSlot]).toBe(0)
			expect(forces.columns.y[forceSlot]).toBe(0)
			expect(forces.columns.torque[forceSlot]).toBe(0)
		}
		expect(islandCount(world)).toBe(1)
	})

	test("waking one member wakes the whole group", () => {
		const world = sleepWorld()
		const group = [box(world, 0), box(world, 50), box(world, 100)]
		fallAsleep(world, group)
		world.flushDeferred()
		for (const body of group) {
			setSleepTime(world, body, 0.4)
		}
		wakeBody(world, group[1])
		world.flushDeferred()
		for (const body of group) {
			expect(world.has(body, Asleep)).toBe(false)
			expect(sleepTimeOf(world, body)).toBe(0)
		}
		expect(islandCount(world)).toBe(0)
	})

	test("wakeBody resets the timer before the flush", () => {
		const world = sleepWorld()
		const body = box(world, 0)
		setSleepTime(world, body, 0.4)
		wakeBody(world, body)
		expect(sleepTimeOf(world, body)).toBe(0)
	})

	test("a recycled entity is not woken", () => {
		const world = sleepWorld()
		const first = box(world, 0)
		const second = box(world, 50)
		fallAsleep(world, [first, second])
		world.flushDeferred()
		world.destroyEntity(first)
		const recycled = box(world, 200)
		world.add(recycled, Asleep)
		wakeBody(world, second)
		world.flushDeferred()
		expect(world.has(second, Asleep)).toBe(false)
		expect(world.has(recycled, Asleep)).toBe(true)
	})

	test("wakeAllBodies wakes every sleeper", () => {
		const world = sleepWorld()
		const first = box(world, 0)
		const second = box(world, 50)
		fallAsleep(world, [first])
		fallAsleep(world, [second])
		world.flushDeferred()
		wakeAllBodies(world)
		world.flushDeferred()
		expect(world.has(first, Asleep)).toBe(false)
		expect(world.has(second, Asleep)).toBe(false)
		expect(islandCount(world)).toBe(0)
	})

	test("wakeBodiesOverlapping wakes only overlapping sleepers", () => {
		const world = sleepWorld()
		const near = box(world, 0)
		const far = box(world, 100)
		fallAsleep(world, [near])
		fallAsleep(world, [far])
		world.flushDeferred()
		wakeBodiesOverlapping(world, -2, -2, 2, 2)
		world.flushDeferred()
		expect(world.has(near, Asleep)).toBe(false)
		expect(world.has(far, Asleep)).toBe(true)
	})

	test("wakeBodiesOverlapping reaches sleepers within the margin", () => {
		const world = sleepWorld()
		const body = box(world, 0)
		fallAsleep(world, [body])
		world.flushDeferred()
		wakeBodiesOverlapping(world, 5.5, -2, 20, 2)
		world.flushDeferred()
		expect(world.has(body, Asleep)).toBe(false)
	})
})
