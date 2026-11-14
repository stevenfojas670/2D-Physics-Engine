import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { WindExposure } from "@/components/WindExposure"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { WindResource } from "@/resources/Wind"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { createWindSystem } from "@/systems/WindSystem"

const STEP = 1 / 60

function windyWorld(): World {
	const world = new World()
	world.setResource(WindResource, { x: 100, y: -20 })
	return world
}

function forceOf(world: World, entity: Entity): [number, number] {
	const forces = world.store(ForceAccumulator)
	const slot = forces.slotOf(entity)
	return [forces.columns.x[slot], forces.columns.y[slot]]
}

describe("wind", () => {
	test("wind pushes exposed bodies by wind times exposure", () => {
		const world = windyWorld()
		const body = spawnRigidBody(world, createRectangleShape(10, 10), 0, 0, 1)
		world.add(body, WindExposure, { exposure: 2 })
		createWindSystem(world)(STEP)
		expect(forceOf(world, body)).toEqual([200, -40])
	})

	test("bodies without exposure feel no wind", () => {
		const world = windyWorld()
		const body = spawnRigidBody(world, createRectangleShape(10, 10), 0, 0, 1)
		createWindSystem(world)(STEP)
		expect(forceOf(world, body)).toEqual([0, 0])
	})

	test("static bodies with exposure are skipped", () => {
		const world = windyWorld()
		const body = spawnStaticBody(world, createRectangleShape(10, 10), 0, 0)
		world.add(body, WindExposure, { exposure: 2 })
		const wind = createWindSystem(world)
		expect(() => wind(STEP)).not.toThrow()
		expect(world.has(body, ForceAccumulator)).toBe(false)
	})
})
