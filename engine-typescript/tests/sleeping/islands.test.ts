import { describe, expect, test } from "vitest"
import type { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { SpringJoint } from "@/components/SpringJoint"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { IslandsResource } from "@/resources/Islands"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { wakeBody } from "@/sleeping/wakeBodies"
import { destroyBody } from "@/sleeping/worldEdits"
import { UnionFind } from "@/sleeping/UnionFind"
import {
	isAsleep,
	physicsWorld,
	positionOf,
	stepWorld,
} from "../systems/physicsWorld"

const WAKE_SAG = 0.5

function box(world: World, x: number, y: number): Entity {
	return spawnRigidBody(world, createRectangleShape(20, 20), x, y, 1)
}

interface Stack {
	world: World
	boxes: Entity[]
}

function stack(height: number, topCanSleep = true): Stack {
	const world = physicsWorld(0, 200)
	spawnStaticBody(world, createRectangleShape(400, 20), 0, 300)
	const boxes: Entity[] = []
	for (let level = 0; level < height; level++) {
		const isTop = level === height - 1
		boxes.push(
			spawnRigidBody(
				world,
				createRectangleShape(20, 20),
				0,
				290 - 10 - 20.1 * level,
				1,
				{ canSleep: topCanSleep || !isTop },
			),
		)
	}
	return { world, boxes }
}

function sleepingStack(height: number): Stack {
	const built = stack(height)
	stepWorld(built.world, 600)
	for (const box of built.boxes) {
		expect(isAsleep(built.world, box)).toBe(true)
	}
	return built
}

function islandOf(world: World, entity: Entity): number {
	return world.resource(IslandsResource).islandOf(entity)
}

describe("union-find", () => {
	test("a chain shares one root and an unlinked index stays alone", () => {
		const sets = new UnionFind()
		sets.reset(4)
		sets.union(0, 1)
		sets.union(1, 2)
		expect(sets.find(0)).toBe(sets.find(2))
		expect(sets.find(3)).toBe(3)
	})

	test("reset to a larger size keeps working", () => {
		const sets = new UnionFind()
		sets.reset(2)
		sets.union(0, 1)
		sets.reset(100)
		expect(sets.find(1)).toBe(1)
		sets.union(98, 99)
		expect(sets.find(98)).toBe(sets.find(99))
	})
})

describe("islands", () => {
	test("a chain of touching bodies is one island", () => {
		const world = physicsWorld(0, 0)
		const bodies = [box(world, 0, 0), box(world, 19.9, 0), box(world, 39.8, 0)]
		stepWorld(world, 1)
		const island = islandOf(world, bodies[0])
		expect(island).toBeGreaterThan(-1)
		expect(islandOf(world, bodies[1])).toBe(island)
		expect(islandOf(world, bodies[2])).toBe(island)
		expect(world.resource(IslandsResource).members(island)).toHaveLength(3)
	})

	test("two piles on one floor are two islands", () => {
		const world = physicsWorld(0, 200)
		const floor = spawnStaticBody(world, createRectangleShape(400, 20), 0, 300)
		const left = [box(world, -100, 280), box(world, -100, 259.9)]
		const right = [box(world, 100, 280), box(world, 100, 259.9)]
		stepWorld(world, 20)
		expect(islandOf(world, left[0])).toBe(islandOf(world, left[1]))
		expect(islandOf(world, right[0])).toBe(islandOf(world, right[1]))
		expect(islandOf(world, left[0])).not.toBe(islandOf(world, right[0]))
		expect(islandOf(world, floor)).toBe(-1)
	})

	test("a joint links two bodies that don't touch", () => {
		const world = physicsWorld(0, 0)
		const first = box(world, 0, 0)
		const second = box(world, 100, 0)
		const joint = world.createEntity()
		world.add(joint, SpringJoint, {
			entityA: first,
			entityB: second,
			springConstant: 2,
			restLength: 100,
		})
		stepWorld(world, 1)
		expect(islandOf(world, first)).toBe(islandOf(world, second))
	})

	test("bodies spawned mid-run join islands", () => {
		const world = physicsWorld(0, 0)
		box(world, 500, 500)
		stepWorld(world, 1)
		const first = box(world, 0, 0)
		const second = box(world, 19.9, 0)
		stepWorld(world, 1)
		expect(islandOf(world, first)).toBeGreaterThan(-1)
		expect(islandOf(world, first)).toBe(islandOf(world, second))
	})
})

describe("sleeping by island", () => {
	test("a stack falls asleep together", () => {
		const { world, boxes } = stack(5)
		let firstAsleep = -1
		let allAsleep = -1
		stepWorld(world, 600, (step) => {
			const sleeping = boxes.filter((box) => isAsleep(world, box)).length
			if (firstAsleep === -1 && sleeping > 0) {
				firstAsleep = step
			}
			if (allAsleep === -1 && sleeping === boxes.length) {
				allAsleep = step
			}
		})
		expect(firstAsleep).toBeGreaterThan(-1)
		expect(allAsleep).toBe(firstAsleep)
	})

	test("a NeverSleep body keeps its pile awake", () => {
		const { world, boxes } = stack(3, false)
		let anyAsleep = false
		stepWorld(world, 900, () => {
			anyAsleep ||= boxes.some((box) => isAsleep(world, box))
		})
		expect(anyAsleep).toBe(false)
	})

	test("touching one body wakes the whole sleeping stack at once", () => {
		const { world, boxes } = sleepingStack(5)
		wakeBody(world, boxes[4])
		world.flushDeferred()
		for (const box of boxes) {
			expect(isAsleep(world, box)).toBe(false)
		}
	})

	test("destroying the bottom of a sleeping stack wakes all of it in one step", () => {
		const { world, boxes } = sleepingStack(5)
		destroyBody(world, boxes[0])
		stepWorld(world, 1)
		for (const box of boxes.slice(1)) {
			expect(isAsleep(world, box)).toBe(false)
		}
	})

	test("a woken stack doesn't sag", () => {
		const { world, boxes } = sleepingStack(10)
		const [, topY] = positionOf(world, boxes[9])
		wakeBody(world, boxes[9])
		stepWorld(world, 60)
		const [, wokenTopY] = positionOf(world, boxes[9])
		console.log(`woken stack sag: ${(wokenTopY - topY).toFixed(3)} px`)
		expect(Math.abs(wokenTopY - topY)).toBeLessThan(WAKE_SAG)
	})
})
