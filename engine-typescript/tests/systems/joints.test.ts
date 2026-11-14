import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { ForceJoint } from "@/components/ForceJoint"
import { SpringJoint } from "@/components/SpringJoint"
import { Transform } from "@/components/Transform"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import {
	StretchState,
	addForceAtPoint,
	anchorWorldPosition,
} from "@/joints/jointForces"
import { createRectangleShape } from "@/shapes/colliderShapes"
import { createJointForceSystem } from "@/systems/JointForceSystem"

function forceOf(world: World, entity: Entity): [number, number, number] {
	const forces = world.store(ForceAccumulator)
	const slot = forces.slotOf(entity)
	return [
		forces.columns.x[slot],
		forces.columns.y[slot],
		forces.columns.torque[slot],
	]
}

function box(world: World, x: number, y: number): Entity {
	return spawnRigidBody(world, createRectangleShape(10, 10), x, y, 1)
}

function connectSpring(
	world: World,
	entityA: Entity,
	entityB: Entity,
	restLength: number,
): Entity {
	const joint = world.createEntity()
	world.add(joint, SpringJoint, {
		entityA,
		entityB,
		springConstant: 2,
		restLength,
	})
	return joint
}

function stretchStateOf(world: World, joint: Entity): number {
	const springs = world.store(SpringJoint)
	return springs.columns.stretchState[springs.slotOf(joint)]
}

describe("anchor helpers", () => {
	test("anchor world position rotates the local anchor and adds the position", () => {
		const world = new World()
		const body = box(world, 100, 50)
		const transforms = world.store(Transform)
		const slot = transforms.slotOf(body)
		transforms.columns.angle[slot] = Math.PI / 2
		const out = { x: 0, y: 0 }
		anchorWorldPosition(transforms.columns, slot, 10, 0, out)
		expect(out.x).toBeCloseTo(100, 9)
		expect(out.y).toBeCloseTo(60, 9)
	})

	test("force at an off-centre point adds force and torque", () => {
		const world = new World()
		const body = box(world, 0, 0)
		addForceAtPoint(
			world.store(Transform),
			world.store(ForceAccumulator),
			body,
			5,
			0,
			0,
			10,
		)
		expect(forceOf(world, body)).toEqual([0, 10, 50])
	})

	test("force at a point on a body without an accumulator does nothing", () => {
		const world = new World()
		const wall = spawnStaticBody(world, createRectangleShape(10, 10), 0, 0)
		expect(() =>
			addForceAtPoint(
				world.store(Transform),
				world.store(ForceAccumulator),
				wall,
				0,
				0,
				1,
				1,
			),
		).not.toThrow()
		expect(world.has(wall, ForceAccumulator)).toBe(false)
	})
})

describe("joint force system", () => {
	test("a stretched spring pulls its bodies together", () => {
		const world = new World()
		const bodyA = box(world, 0, 0)
		const bodyB = box(world, 100, 0)
		connectSpring(world, bodyA, bodyB, 50)
		createJointForceSystem(world)(1 / 60)
		expect(forceOf(world, bodyA)[0]).toBeCloseTo(2500, 9)
		expect(forceOf(world, bodyB)[0]).toBeCloseTo(-2500, 9)
		expect(forceOf(world, bodyA)[1]).toBe(0)
	})

	test("a spring to an immovable body uses full force", () => {
		const world = new World()
		const bodyA = box(world, 0, 0)
		const anchor = spawnStaticBody(world, createRectangleShape(10, 10), 100, 0)
		connectSpring(world, bodyA, anchor, 50)
		createJointForceSystem(world)(1 / 60)
		expect(forceOf(world, bodyA)[0]).toBeCloseTo(5000, 9)
	})

	test("stretch state reflects compression", () => {
		const world = new World()
		const compressed = connectSpring(
			world,
			box(world, 0, 0),
			box(world, 20, 0),
			50,
		)
		const stretched = connectSpring(
			world,
			box(world, 0, 200),
			box(world, 100, 200),
			50,
		)
		createJointForceSystem(world)(1 / 60)
		expect(stretchStateOf(world, compressed)).toBe(StretchState.COMPRESSED)
		expect(stretchStateOf(world, stretched)).toBe(StretchState.STRETCHED)
	})

	test("skips joint whose body was destroyed", () => {
		const world = new World()
		const bodyA = box(world, 0, 0)
		const bodyB = box(world, 100, 0)
		connectSpring(world, bodyA, bodyB, 50)
		const forceJoint = world.createEntity()
		world.add(forceJoint, ForceJoint, {
			entityA: bodyA,
			entityB: bodyB,
			strength: 10,
		})
		world.destroyEntity(bodyB)
		expect(() => createJointForceSystem(world)(1 / 60)).not.toThrow()
		expect(forceOf(world, bodyA)).toEqual([0, 0, 0])
	})

	test("force joint applies each side's pull at the other body's anchor", () => {
		const world = new World()
		const bodyA = box(world, 0, 0)
		const bodyB = box(world, 100, 0)
		const joint = world.createEntity()
		world.add(joint, ForceJoint, {
			entityA: bodyA,
			entityB: bodyB,
			anchorAX: 0,
			anchorAY: 5,
			anchorBX: 0,
			anchorBY: 5,
			strength: 10,
		})
		createJointForceSystem(world)(1 / 60)
		const [forceAX, forceAY, torqueA] = forceOf(world, bodyA)
		expect(forceAX).toBeCloseTo(5, 9)
		expect(forceAY).toBeCloseTo(0, 9)
		expect(torqueA).toBeCloseTo(-25, 9)
		expect(forceOf(world, bodyB)[0]).toBeCloseTo(-5, 9)
	})
})
