import { describe, expect, test } from "vitest"
import type { Schedule } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { createUpdateSchedule } from "@/app/schedules"
import type { Entity } from "@/ecs/Entity"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { SpringJoint } from "@/components/SpringJoint"
import { Velocity } from "@/components/Velocity"
import { MouseInputResource } from "@/app/MouseInput"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import type { BodyOptions } from "@/components/bodyFactories"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import { CollisionSettingsResource } from "@/resources/CollisionSettings"
import { GravityResource } from "@/resources/Gravity"
import { SleepSettingsResource } from "@/resources/SleepSettings"
import { WindResource } from "@/resources/Wind"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { wakeBody } from "@/sleeping/wakeBodies"
import { destroyBody } from "@/sleeping/worldEdits"
import {
	PHYSICS_STEP,
	isAsleep,
	physicsWorld,
	positionOf,
	stepWorld,
	velocityOf,
} from "./physicsWorld"

interface RestingBox {
	world: World
	floor: Entity
	box: Entity
}

function restingBox(options: BodyOptions = {}): RestingBox {
	const world = physicsWorld(0, 200)
	const floor = spawnStaticBody(world, createRectangleShape(400, 20), 0, 100)
	const box = spawnRigidBody(
		world,
		createRectangleShape(20, 20),
		0,
		40,
		1,
		options,
	)
	return { world, floor, box }
}

function firstSleepStep(world: World, body: Entity, steps: number): number {
	let first = -1
	stepWorld(world, steps, (step) => {
		if (first === -1 && isAsleep(world, body)) {
			first = step
		}
	})
	return first
}

function sleepingBox(): RestingBox {
	const resting = restingBox()
	stepWorld(resting.world, 300)
	expect(isAsleep(resting.world, resting.box)).toBe(true)
	return resting
}

function connectSpring(world: World, entityA: Entity, entityB: Entity): void {
	const joint = world.createEntity()
	world.add(joint, SpringJoint, {
		entityA,
		entityB,
		springConstant: 2,
		restLength: 40,
	})
}

function everAwake(world: World, body: Entity, steps: number): boolean {
	let woke = false
	stepWorld(world, steps, () => {
		woke ||= !isAsleep(world, body)
	})
	return woke
}

function everAsleep(world: World, body: Entity, steps: number): boolean {
	return firstSleepStep(world, body, steps) !== -1
}

describe("sleeping", () => {
	test("a resting box falls asleep", () => {
		const { world, box } = restingBox()
		const step = firstSleepStep(world, box, 300)
		expect(step).toBeGreaterThan(-1)
		expect(velocityOf(world, box)).toEqual([0, 0, 0])
	})

	test("a sleeper is not integrated", () => {
		const { world, box } = restingBox()
		stepWorld(world, 300)
		expect(isAsleep(world, box)).toBe(true)
		const before = positionOf(world, box)
		stepWorld(world, 120)
		expect(positionOf(world, box)).toEqual(before)
	})

	test("a thrown body never sleeps in mid-air", () => {
		const world = physicsWorld(0, 200)
		const body = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		world.add(body, Velocity, { x: 0, y: -100, angular: 0 })
		expect(everAsleep(world, body, 120)).toBe(false)
	})

	test("a body that can't sleep never does", () => {
		const { world, box } = restingBox({ canSleep: false })
		expect(everAsleep(world, box, 600)).toBe(false)
	})

	test("nothing sleeps when sleeping is disabled", () => {
		const { world, box } = restingBox()
		world.resource(SleepSettingsResource).enabled = false
		expect(everAsleep(world, box, 600)).toBe(false)
	})
})

describe("waking", () => {
	test("a falling box wakes a sleeper", () => {
		const { world, box } = sleepingBox()
		const falling = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			0,
			-40,
			1,
		)
		expect(everAwake(world, box, 120)).toBe(true)
		stepWorld(world, 600)
		expect(isAsleep(world, box)).toBe(true)
		expect(isAsleep(world, falling)).toBe(true)
	})

	test("a joint to an awake body wakes a sleeper", () => {
		const { world, box } = sleepingBox()
		const other = spawnRigidBody(world, createRectangleShape(20, 20), 60, 40, 1)
		connectSpring(world, box, other)
		stepWorld(world, 1)
		expect(isAsleep(world, box)).toBe(false)
	})

	test("a joint to a static body doesn't wake a sleeper", () => {
		const { world, floor, box } = sleepingBox()
		connectSpring(world, box, floor)
		expect(everAwake(world, box, 60)).toBe(false)
	})

	test("dragging wakes a sleeper and keeps it awake", () => {
		const { world, box } = sleepingBox()
		const [x, y] = positionOf(world, box)
		const mouse = world.resource(MouseInputResource)
		mouse.x = x
		mouse.y = y
		mouse.leftDown = true
		stepWorld(world, 1)
		expect(isAsleep(world, box)).toBe(false)
		expect(everAsleep(world, box, 300)).toBe(false)
	})

	test("a woken body starts from rest", () => {
		const { world, floor, box } = sleepingBox()
		world.destroyEntity(floor)
		wakeBody(world, box)
		stepWorld(world, 1)
		const [velocityX, velocityY, angular] = velocityOf(world, box)
		expect(velocityX).toBe(0)
		expect(angular).toBe(0)
		expect(velocityY).toBeCloseTo((200 / 60) * 0.999, 9)
	})

	test("setting a velocity and calling wakeBody moves a sleeper", () => {
		const { world, box } = sleepingBox()
		const [startX] = positionOf(world, box)
		world.add(box, Velocity, { x: 50, y: 0, angular: 0 })
		wakeBody(world, box)
		stepWorld(world, 1)
		expect(positionOf(world, box)[0]).toBeGreaterThan(startX)
	})
})

describe("waking on world changes", () => {
	const changes: Record<string, (world: World) => void> = {
		gravity: (world) => {
			world.setResource(GravityResource, { x: 0, y: -200 })
		},
		wind: (world) => {
			world.setResource(WindResource, { x: 50, y: 0 })
		},
		"collision matrix": (world) => {
			world
				.resource(CollisionSettingsResource)
				.disableCollision(CollisionGroups.GROUP0, CollisionGroups.GROUP1)
		},
		"sleeping switch": (world) => {
			world.resource(SleepSettingsResource).enabled = false
		},
	}

	function runSteps(schedule: Schedule, world: World, steps: number): void {
		for (let step = 0; step < steps; step++) {
			schedule.run(world, PHYSICS_STEP)
		}
	}

	function sleepingBoxWithSchedule(): RestingBox & { schedule: Schedule } {
		const resting = restingBox()
		const schedule = createUpdateSchedule(resting.world)
		runSteps(schedule, resting.world, 300)
		expect(isAsleep(resting.world, resting.box)).toBe(true)
		return { ...resting, schedule }
	}

	for (const [name, change] of Object.entries(changes)) {
		test(`changing the ${name} wakes every sleeper`, () => {
			const { world, box, schedule } = sleepingBoxWithSchedule()
			change(world)
			runSteps(schedule, world, 1)
			expect(isAsleep(world, box)).toBe(false)
		})
	}

	test("an unchanged world keeps sleepers asleep", () => {
		const { world, box, schedule } = sleepingBoxWithSchedule()
		runSteps(schedule, world, 60)
		expect(isAsleep(world, box)).toBe(true)
	})
})

describe("sleeping edge cases", () => {
	test("a joint to a resting body adds no force to a sleeper", () => {
		const { world, box } = sleepingBox()
		const other = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			100,
			80,
			1,
		)
		stepWorld(world, 10)
		const joint = world.createEntity()
		world.add(joint, SpringJoint, {
			entityA: box,
			entityB: other,
			springConstant: 0.05,
			restLength: 90,
		})
		stepWorld(world, 120)
		expect(isAsleep(world, box)).toBe(true)
		const forces = world.store(ForceAccumulator)
		expect(forces.columns.x[forces.slotOf(box)]).toBe(0)
		expect(forces.columns.y[forces.slotOf(box)]).toBe(0)
	})

	test("a body left without support doesn't sleep in mid-air", () => {
		const world = physicsWorld(0, 40)
		spawnStaticBody(world, createRectangleShape(400, 20), 0, 300)
		const support = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			0,
			280,
			1,
			{ canSleep: false },
		)
		const crate = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			0,
			259.9,
			1,
		)
		stepWorld(world, 300)
		destroyBody(world, support)
		const [, startY] = positionOf(world, crate)
		let asleepInAir = false
		stepWorld(world, 30, () => {
			const [, y] = positionOf(world, crate)
			asleepInAir ||= isAsleep(world, crate) && y < startY + 15
		})
		expect(asleepInAir).toBe(false)
	})
})
