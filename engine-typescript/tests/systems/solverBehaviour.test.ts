import { describe, expect, test } from "vitest"
import type { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Collider } from "@/components/Collider"
import { LinearDamping } from "@/components/LinearDamping"
import { Material } from "@/components/Material"
import { Velocity } from "@/components/Velocity"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { createSolverSettings } from "@/resources/SolverSettings"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"
import { physicsWorld, positionOf, stepWorld, velocityOf } from "./physicsWorld"

const FLOOR_TOP = 290
const BALL_RADIUS = 10
const BALL_REST_Y = FLOOR_TOP - BALL_RADIUS
const DROP_GAP = 100
const BOX_REST_Y = 80
const SLOP = createSolverSettings().slop

function floorAt(world: World, y: number): Entity {
	return spawnStaticBody(world, createRectangleShape(400, 20), 0, y)
}

function setMaterial(
	world: World,
	entity: Entity,
	restitution: number,
	friction: number,
): void {
	world.add(entity, Material, { restitution, friction })
}

function droppedBall(restitution: number): { world: World; ball: Entity } {
	const world = physicsWorld(0, 200)
	const floor = floorAt(world, FLOOR_TOP + 10)
	const ball = spawnRigidBody(
		world,
		createCircleShape(BALL_RADIUS),
		0,
		BALL_REST_Y - DROP_GAP,
		1,
	)
	setMaterial(world, floor, 0, 0.1)
	setMaterial(world, ball, restitution, 0.1)
	world.add(ball, LinearDamping, { linear: 1, angular: 1 })
	return { world, ball }
}

function boxOnFloor(
	gravityX: number,
	gravityY: number,
	friction: number,
	restitution: number,
): { world: World; box: Entity } {
	const world = physicsWorld(gravityX, gravityY)
	const floor = floorAt(world, 100)
	const box = spawnRigidBody(
		world,
		createRectangleShape(20, 20),
		0,
		BOX_REST_Y + 0.4,
		1,
	)
	setMaterial(world, floor, restitution, friction)
	setMaterial(world, box, restitution, friction)
	return { world, box }
}

function tiltedGravity(degrees: number): [number, number] {
	const radians = (degrees * Math.PI) / 180
	return [200 * Math.sin(radians), 200 * Math.cos(radians)]
}

function slopeDrift(degrees: number, settleSteps: number, steps: number) {
	const [gravityX, gravityY] = tiltedGravity(degrees)
	const { world, box } = boxOnFloor(gravityX, gravityY, 0.5, 0)
	stepWorld(world, settleSteps)
	const startX = positionOf(world, box)[0]
	stepWorld(world, steps)
	return positionOf(world, box)[0] - startX
}

describe("solver behaviour", () => {
	test("restitution r reaches about r squared of its drop height", () => {
		const { world, ball } = droppedBall(0.8)
		let phase: "falling" | "rising" | "done" = "falling"
		let highest = Number.MAX_VALUE
		stepWorld(world, 240, () => {
			const velocityY = velocityOf(world, ball)[1]
			if (phase === "falling" && velocityY < 0) {
				phase = "rising"
			}
			if (phase === "rising") {
				highest = Math.min(highest, positionOf(world, ball)[1])
				if (velocityY >= 0) {
					phase = "done"
				}
			}
		})
		const peak = BALL_REST_Y - highest
		expect(peak).toBeGreaterThan(64 * 0.9)
		expect(peak).toBeLessThan(64 * 1.1)
	})

	test("restitution 0 does not bounce", () => {
		const { world, ball } = droppedBall(0)
		let landed = false
		let highestAfterLanding = Number.MAX_VALUE
		stepWorld(world, 240, () => {
			const [velocityX, velocityY] = velocityOf(world, ball)
			expect(Number.isNaN(velocityX) || Number.isNaN(velocityY)).toBe(false)
			const y = positionOf(world, ball)[1]
			if (y > BALL_REST_Y - 1) {
				landed = true
			}
			if (landed) {
				highestAfterLanding = Math.min(highestAfterLanding, y)
			}
		})
		expect(landed).toBe(true)
		expect(highestAfterLanding).toBeGreaterThan(BALL_REST_Y - 1 - 0.5)
	})

	test("a box slides on a slope steeper than atan(mu)", () => {
		expect(slopeDrift(35, 0, 120)).toBeGreaterThan(20)
		expect(slopeDrift(-35, 0, 120)).toBeLessThan(-20)
	})

	test("a box holds on a shallower slope", () => {
		expect(Math.abs(slopeDrift(15, 30, 120))).toBeLessThan(0.5)
		expect(Math.abs(slopeDrift(-15, 30, 120))).toBeLessThan(0.5)
	})

	test("friction does not depend on restitution", () => {
		const slide = (restitution: number): number => {
			const { world, box } = boxOnFloor(0, 200, 0.5, restitution)
			world.add(box, Velocity, { x: 100, y: 0 })
			stepWorld(world, 30)
			return velocityOf(world, box)[0]
		}
		expect(Math.abs(slide(0) - slide(0.9))).toBeLessThan(1e-6)
	})

	test("an overlap is removed without adding velocity", () => {
		const world = physicsWorld(0, 0)
		floorAt(world, 100)
		const box = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			0,
			BOX_REST_Y + 3,
			1,
		)
		stepWorld(world, 60, () => {
			const [velocityX, velocityY, angular] = velocityOf(world, box)
			expect(Math.abs(velocityX)).toBeLessThan(1e-12)
			expect(Math.abs(velocityY)).toBeLessThan(1e-12)
			expect(Math.abs(angular)).toBeLessThan(1e-12)
		})
		expect(positionOf(world, box)[1]).toBeLessThanOrEqual(
			BOX_REST_Y + SLOP + 0.01,
		)
	})

	test("touching survives to rendering", () => {
		const world = physicsWorld(0, 0)
		const left = spawnRigidBody(world, createRectangleShape(20, 20), 0, 0, 1)
		const right = spawnRigidBody(world, createRectangleShape(20, 20), 15, 0, 1)
		stepWorld(world, 1)
		const colliders = world.store(Collider)
		expect(colliders.columns.touching[colliders.slotOf(left)]).toBe(1)
		expect(colliders.columns.touching[colliders.slotOf(right)]).toBe(1)
	})
})
