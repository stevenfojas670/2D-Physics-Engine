import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { buildBenchmarkScene } from "@/app/BenchmarkScene"
import { LinearDamping } from "@/components/LinearDamping"
import { Mass } from "@/components/Mass"
import { Velocity } from "@/components/Velocity"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"
import {
	installInputResources,
	isAsleep,
	physicsWorld,
	positionOf,
	stepWorld,
	velocityOf,
} from "./physicsWorld"

const STACK_DRIFT = 1
const TEN_BOX_SINK = 2
const TWENTY_BOX_SINK = 9
const PYRAMID_BODIES = 210
const PYRAMID_SPEED = 5
const SETTLED_SHARE = 0.9
const STANDING_DRIFT = 2
const STANDING_SAG = 8
const MOMENTUM_TOLERANCE = 1e-6

function box(world: World, x: number, y: number): Entity {
	return spawnRigidBody(world, createRectangleShape(20, 20), x, y, 1)
}

function speedAtShare(world: World, share: number): number {
	const velocities = world.store(Velocity)
	const speeds: number[] = []
	for (let slot = 0; slot < velocities.size; slot++) {
		speeds.push(
			Math.sqrt(
				velocities.columns.x[slot] ** 2 + velocities.columns.y[slot] ** 2,
			),
		)
	}
	speeds.sort((left, right) => left - right)
	return speeds[Math.floor(speeds.length * share)]
}

function expectStackStands(height: number, maxSink: number): void {
	const world = physicsWorld(0, 200)
	spawnStaticBody(world, createRectangleShape(400, 20), 0, 300)
	const stack: Entity[] = []
	for (let level = 0; level < height; level++) {
		stack.push(box(world, 0, 290 - 10 - 20.1 * level))
	}
	stepWorld(world, 600)
	const [topX, topY] = positionOf(world, stack[height - 1])
	const restingTopY = 290 - 10 - 20 * (height - 1)
	expect(Math.abs(topX)).toBeLessThan(STACK_DRIFT)
	expect(Math.abs(topY - restingTopY)).toBeLessThan(maxSink)
}

function momentum(world: World, bodies: Entity[]): [number, number] {
	const masses = world.store(Mass)
	let momentumX = 0
	let momentumY = 0
	for (const body of bodies) {
		const mass = masses.columns.mass[masses.slotOf(body)]
		const [velocityX, velocityY] = velocityOf(world, body)
		momentumX += mass * velocityX
		momentumY += mass * velocityY
	}
	return [momentumX, momentumY]
}

describe("solver stability", () => {
	test("resting box stays on the floor", () => {
		const world = physicsWorld(0, 200)
		spawnStaticBody(world, createRectangleShape(400, 20), 0, 100)
		const falling = box(world, 0, 40)
		const heights: number[] = []
		stepWorld(world, 300, (step) => {
			if (step >= 240) {
				heights.push(positionOf(world, falling)[1])
			}
		})
		expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.5)
		expect(positionOf(world, falling)[1]).toBeGreaterThan(75)
		expect(positionOf(world, falling)[1]).toBeLessThan(81)
		expect(Math.abs(velocityOf(world, falling)[1])).toBeLessThan(1)
	})

	test("ten-box stack stays standing", () => {
		expectStackStands(10, TEN_BOX_SINK)
	})

	test("twenty-box stack stays standing", () => {
		expectStackStands(20, TWENTY_BOX_SINK)
	})

	test("small pyramid settles", () => {
		const world = new World()
		buildBenchmarkScene(world, PYRAMID_BODIES)
		installInputResources(world)
		stepWorld(world, 600)
		expect(speedAtShare(world, SETTLED_SHARE)).toBeLessThan(PYRAMID_SPEED)
	})

	test("small standing pyramid stays up and falls asleep", () => {
		const world = new World()
		buildBenchmarkScene(world, PYRAMID_BODIES, "standing")
		installInputResources(world)
		const velocities = world.store(Velocity)
		const bodies: Entity[] = []
		for (let slot = 0; slot < velocities.size; slot++) {
			bodies.push(velocities.entityAt(slot))
		}
		const starts = bodies.map((body) => positionOf(world, body))
		stepWorld(world, 600)
		bodies.forEach((body, index) => {
			const [x, y] = positionOf(world, body)
			expect(Math.abs(x - starts[index][0])).toBeLessThan(STANDING_DRIFT)
			expect(Math.abs(y - starts[index][1])).toBeLessThan(STANDING_SAG)
		})
		const asleep = bodies.filter((body) => isAsleep(world, body)).length
		expect(asleep).toBe(bodies.length)
	})

	test("momentum is conserved in a collision", () => {
		const world = physicsWorld(0, 0)
		const light = spawnRigidBody(world, createCircleShape(10), 0, 0, 1)
		const heavy = spawnRigidBody(world, createCircleShape(10), 25, 4, 3)
		const bodies = [light, heavy]
		for (const body of bodies) {
			world.add(body, LinearDamping, { linear: 1, angular: 1 })
		}
		world.add(light, Velocity, { x: 50, y: 0 })
		world.add(heavy, Velocity, { x: -10, y: 0 })
		const [startX, startY] = momentum(world, bodies)
		stepWorld(world, 60)
		const [endX, endY] = momentum(world, bodies)
		expect(Math.abs(endX - startX)).toBeLessThan(MOMENTUM_TOLERANCE)
		expect(Math.abs(endY - startY)).toBeLessThan(MOMENTUM_TOLERANCE)
		expect(velocityOf(world, light)[0]).toBeLessThan(50)
	})
})
