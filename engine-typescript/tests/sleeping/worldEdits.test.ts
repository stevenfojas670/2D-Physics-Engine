import { describe, expect, test } from "vitest"
import type { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { SpringJoint } from "@/components/SpringJoint"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import { createRectangleShape } from "@/shapes/colliderShapes"
import {
	destroyBody,
	moveStaticBody,
	setCollisionGroup,
} from "@/sleeping/worldEdits"
import {
	isAsleep,
	physicsWorld,
	positionOf,
	stepWorld,
} from "../systems/physicsWorld"

const FLOOR_Y = 300
const SETTLE_STEPS = 300

interface Scene {
	world: World
	floor: Entity
	boxes: Entity[]
}

function stackScene(height: number): Scene {
	const world = physicsWorld(0, 200)
	const floor = spawnStaticBody(
		world,
		createRectangleShape(400, 20),
		0,
		FLOOR_Y,
	)
	const boxes: Entity[] = []
	for (let level = 0; level < height; level++) {
		boxes.push(
			spawnRigidBody(
				world,
				createRectangleShape(20, 20),
				0,
				FLOOR_Y - 20 - 20.1 * level,
				1,
			),
		)
	}
	stepWorld(world, SETTLE_STEPS)
	for (const box of boxes) {
		expect(isAsleep(world, box)).toBe(true)
	}
	return { world, floor, boxes }
}

function heightOf(world: World, entity: Entity): number {
	return positionOf(world, entity)[1]
}

describe("waking without motion", () => {
	test("destroying the bottom of a sleeping stack drops the rest", () => {
		const { world, boxes } = stackScene(3)
		const before = boxes.map((box) => heightOf(world, box))
		destroyBody(world, boxes[0])
		stepWorld(world, 120)
		expect(heightOf(world, boxes[1])).toBeGreaterThan(before[1] + 5)
		expect(heightOf(world, boxes[2])).toBeGreaterThan(before[2] + 5)
	})

	test("destroying the floor wakes what rests on it", () => {
		const { world, floor, boxes } = stackScene(1)
		const before = heightOf(world, boxes[0])
		destroyBody(world, floor)
		stepWorld(world, 30)
		expect(heightOf(world, boxes[0])).toBeGreaterThan(before + 5)
	})

	test("destroying a jointed body wakes the other end", () => {
		const world = physicsWorld(0, 200)
		spawnStaticBody(world, createRectangleShape(400, 20), 0, FLOOR_Y)
		const left = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			-100,
			FLOOR_Y - 20,
			1,
		)
		const right = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			100,
			FLOOR_Y - 20,
			1,
		)
		const joint = world.createEntity()
		world.add(joint, SpringJoint, {
			entityA: left,
			entityB: right,
			springConstant: 2,
			restLength: 200,
		})
		stepWorld(world, SETTLE_STEPS)
		expect(isAsleep(world, right)).toBe(true)
		destroyBody(world, left)
		world.flushDeferred()
		expect(isAsleep(world, right)).toBe(false)
	})

	test("moving a static body wakes what it touched", () => {
		const { world, floor, boxes } = stackScene(1)
		const before = heightOf(world, boxes[0])
		moveStaticBody(world, floor, 0, FLOOR_Y + 200, 0)
		stepWorld(world, 30)
		expect(heightOf(world, boxes[0])).toBeGreaterThan(before + 5)
	})

	test("setCollisionGroup wakes overlapping sleepers", () => {
		const { world, boxes } = stackScene(1)
		setCollisionGroup(world, boxes[0], CollisionGroups.GROUP1)
		world.flushDeferred()
		expect(isAsleep(world, boxes[0])).toBe(false)
	})
})
