import { describe, expect, test } from "vitest"
import type { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { SpringJoint } from "@/components/SpringJoint"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { IslandsResource } from "@/resources/Islands"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { UnionFind } from "@/sleeping/UnionFind"
import { physicsWorld, stepWorld } from "../systems/physicsWorld"

function box(world: World, x: number, y: number): Entity {
	return spawnRigidBody(world, createRectangleShape(20, 20), x, y, 1)
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
