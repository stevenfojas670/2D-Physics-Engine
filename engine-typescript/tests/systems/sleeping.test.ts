import { describe, expect, test } from "vitest"
import type { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Velocity } from "@/components/Velocity"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import type { BodyOptions } from "@/components/bodyFactories"
import { SleepSettingsResource } from "@/resources/SleepSettings"
import { createRectangleShape } from "@/shapes/colliderShapes"
import {
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
