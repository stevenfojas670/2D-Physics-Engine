import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { Collider } from "@/components/Collider"
import { MovementIntent } from "@/components/MovementIntent"
import { PlayerControlled } from "@/components/PlayerControlled"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import { WindExposure } from "@/components/WindExposure"
import { spawnRigidBody } from "@/components/bodyFactories"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import { CollisionSettingsResource } from "@/resources/CollisionSettings"
import { GravityResource } from "@/resources/Gravity"
import { MouseDragResource } from "@/resources/MouseDrag"
import { WindResource } from "@/resources/Wind"
import { WorldSizeResource } from "@/resources/WorldSize"
import { createRectangleShape } from "@/shapes/colliderShapes"
import type { ControllerKeys } from "@/types/controller/controller.types"
import { buildBenchmarkScene } from "@/app/BenchmarkScene"
import { ControllerKeysResource } from "@/app/ControllerKeys"
import {
	buildDemoScene,
	installWorldResources,
	resizeDemoWorld,
} from "@/app/DemoScene"
import { FrameTimer } from "@/app/FrameTimer"
import { MouseInputResource, createMouseInput } from "@/app/MouseInput"
import { createPlayerInputSystem } from "@/app/PlayerInputSystem"
import {
	SANDBOX_BODY_COUNT,
	SANDBOX_HEIGHT,
	SANDBOX_RESPAWN_MARGIN,
	SANDBOX_WIDTH,
	SANDBOX_WIND,
	buildSandboxScene,
	createSandboxRespawnSystem,
} from "@/app/SandboxScene"
import { createUpdateSchedule } from "@/app/schedules"

const STEP = 1 / 60

function releasedKeys(): ControllerKeys {
	return {
		KeyW: false,
		KeyA: false,
		KeyS: false,
		KeyD: false,
		KeyQ: false,
		KeyE: false,
		Space: false,
	}
}

function inputWorld(width: number, height: number): World {
	const world = new World()
	installWorldResources(world, width, height)
	world.setResource(ControllerKeysResource, releasedKeys())
	world.setResource(MouseInputResource, createMouseInput())
	return world
}

function positionOf(world: World, entity: Entity): [number, number] {
	const transforms = world.store(Transform)
	const slot = transforms.slotOf(entity)
	return [transforms.columns.x[slot], transforms.columns.y[slot]]
}

describe("player input", () => {
	test("keys become movement intent", () => {
		const world = inputWorld(800, 600)
		const keys = releasedKeys()
		keys.KeyD = true
		keys.KeyW = true
		keys.Space = true
		world.setResource(ControllerKeysResource, keys)
		const player = world.createEntity()
		world.add(player, MovementIntent)
		world.add(player, PlayerControlled)
		createPlayerInputSystem(world)(STEP)
		const intents = world.store(MovementIntent)
		const slot = intents.slotOf(player)
		expect(intents.columns.x[slot]).toBe(1)
		expect(intents.columns.y[slot]).toBe(-1)
		expect(intents.columns.jump[slot]).toBe(1)
	})
})

describe("mouse drag", () => {
	test("picks body when held mouse moves onto it", () => {
		const world = inputWorld(800, 600)
		const body = spawnRigidBody(
			world,
			createRectangleShape(40, 40),
			400,
			300,
			1,
		)
		const update = createUpdateSchedule(world)
		update.run(world, STEP)
		const mouse = world.resource(MouseInputResource)
		mouse.x = 100
		mouse.y = 100
		mouse.leftDown = true
		update.run(world, STEP)
		expect(world.resource(MouseDragResource).active).toBe(false)
		const [bodyX, bodyY] = positionOf(world, body)
		mouse.x = bodyX
		mouse.y = bodyY
		update.run(world, STEP)
		const drag = world.resource(MouseDragResource)
		expect(drag.active).toBe(true)
		expect(drag.entity).toBe(body)
	})

	test("dragging pulls the body toward the mouse", () => {
		const world = inputWorld(800, 600)
		const body = spawnRigidBody(
			world,
			createRectangleShape(40, 40),
			400,
			300,
			1,
		)
		const update = createUpdateSchedule(world)
		update.run(world, STEP)
		const mouse = world.resource(MouseInputResource)
		const [bodyX, bodyY] = positionOf(world, body)
		mouse.x = bodyX
		mouse.y = bodyY
		mouse.leftDown = true
		update.run(world, STEP)
		mouse.x = bodyX + 200
		update.run(world, STEP)
		const velocities = world.store(Velocity)
		expect(velocities.columns.x[velocities.slotOf(body)]).toBeGreaterThan(0)
	})

	test("releases drag when dragged entity is destroyed", () => {
		const world = inputWorld(800, 600)
		const body = spawnRigidBody(
			world,
			createRectangleShape(40, 40),
			400,
			300,
			1,
		)
		const update = createUpdateSchedule(world)
		update.run(world, STEP)
		const mouse = world.resource(MouseInputResource)
		const [bodyX, bodyY] = positionOf(world, body)
		mouse.x = bodyX
		mouse.y = bodyY
		mouse.leftDown = true
		update.run(world, STEP)
		expect(world.resource(MouseDragResource).active).toBe(true)
		world.destroyEntity(body)
		expect(() => update.run(world, STEP)).not.toThrow()
		expect(world.resource(MouseDragResource).active).toBe(false)
	})

	test("releasing the button ends the drag", () => {
		const world = inputWorld(800, 600)
		const body = spawnRigidBody(
			world,
			createRectangleShape(40, 40),
			400,
			300,
			1,
		)
		const update = createUpdateSchedule(world)
		update.run(world, STEP)
		const mouse = world.resource(MouseInputResource)
		const [bodyX, bodyY] = positionOf(world, body)
		mouse.x = bodyX
		mouse.y = bodyY
		mouse.leftDown = true
		update.run(world, STEP)
		mouse.leftDown = false
		update.run(world, STEP)
		expect(world.resource(MouseDragResource).active).toBe(false)
	})
})

describe("scenes", () => {
	test("demo scene builds the spec's bodies", () => {
		const world = inputWorld(800, 600)
		const handles = buildDemoScene(world, 800, 600)
		expect(world.store(Collider).size).toBe(7)
		expect(world.has(handles.player, PlayerControlled)).toBe(true)
		expect(world.has(handles.player, MovementIntent)).toBe(true)
		expect(positionOf(world, handles.player)).toEqual([300, 420])
		const settings = world.resource(CollisionSettingsResource)
		expect(
			settings.canCollide(CollisionGroups.GROUP1.id, CollisionGroups.GROUP2.id),
		).toBe(false)
		expect(settings.groupName(CollisionGroups.GROUP1)).toBe("Kinematic Objects")
		expect(settings.groupName(CollisionGroups.GROUP2)).toBe("Static Objects")
	})

	test("resize moves the walls", () => {
		const world = inputWorld(1000, 700)
		const handles = buildDemoScene(world, 1000, 700)
		resizeDemoWorld(world, handles, 800, 600)
		const [, bottomY] = positionOf(world, handles.walls[1])
		expect(bottomY).toBe(625)
		const [rightX] = positionOf(world, handles.walls[3])
		expect(rightX).toBe(825)
		const colliders = world.store(Collider)
		const bottomSlot = colliders.slotOf(handles.walls[1])
		expect(colliders.columns.minX[bottomSlot]).toBe(0)
		expect(colliders.columns.maxX[bottomSlot]).toBe(800)
	})

	test("benchmark scene builds 2000 bodies plus walls", () => {
		const world = new World()
		buildBenchmarkScene(world)
		expect(world.store(Collider).size).toBe(2004)
		expect(world.store(Velocity).size).toBe(2000)
	})
})

function sandboxWorld(): World {
	const world = new World()
	buildSandboxScene(world)
	world.setResource(ControllerKeysResource, releasedKeys())
	world.setResource(MouseInputResource, createMouseInput())
	return world
}

function exposedEntities(world: World): Entity[] {
	const exposures = world.store(WindExposure)
	const entities: Entity[] = []
	for (let slot = 0; slot < exposures.size; slot++) {
		entities.push(exposures.entityAt(slot))
	}
	return entities
}

function moveTo(world: World, entity: Entity, x: number): void {
	world.add(entity, Transform, { x, y: 300, angle: 0 })
}

function stepSandbox(world: World): void {
	createUpdateSchedule(world)
		.add(createSandboxRespawnSystem(world))
		.run(world, STEP)
}

describe("sandbox", () => {
	const pastRightEdge = SANDBOX_WIDTH + SANDBOX_RESPAWN_MARGIN + 50
	const pastLeftEdge = -SANDBOX_RESPAWN_MARGIN - 50

	test("sandbox scene builds exposed bodies, floor and ceiling", () => {
		const world = sandboxWorld()
		expect(world.store(WindExposure).size).toBe(SANDBOX_BODY_COUNT)
		expect(world.store(Collider).size).toBe(SANDBOX_BODY_COUNT + 2)
		expect(world.resource(WindResource)).toEqual(SANDBOX_WIND)
		expect(world.resource(WorldSizeResource)).toEqual({
			width: SANDBOX_WIDTH,
			height: SANDBOX_HEIGHT,
		})
	})

	test("bodies past the right edge are replaced", () => {
		const world = sandboxWorld()
		const before = new Set(exposedEntities(world))
		const [first, second] = exposedEntities(world)
		moveTo(world, first, pastRightEdge)
		moveTo(world, second, pastRightEdge)
		stepSandbox(world)
		expect(world.isAlive(first)).toBe(false)
		expect(world.isAlive(second)).toBe(false)
		const after = exposedEntities(world)
		expect(after.length).toBe(SANDBOX_BODY_COUNT)
		const replacements = after.filter((entity) => !before.has(entity))
		expect(replacements.length).toBe(2)
		for (const entity of replacements) {
			const [x] = positionOf(world, entity)
			expect(x).toBeGreaterThanOrEqual(0)
			expect(x).toBeLessThanOrEqual(SANDBOX_WIDTH / 4)
		}
	})

	test("bodies past the left edge are replaced", () => {
		const world = sandboxWorld()
		const [first] = exposedEntities(world)
		moveTo(world, first, pastLeftEdge)
		stepSandbox(world)
		expect(world.isAlive(first)).toBe(false)
		expect(exposedEntities(world).length).toBe(SANDBOX_BODY_COUNT)
	})

	test("a replacement keeps the old body's exposure", () => {
		const world = sandboxWorld()
		const [first] = exposedEntities(world)
		world.add(first, WindExposure, { exposure: 3.5 })
		moveTo(world, first, pastRightEdge)
		stepSandbox(world)
		const exposures = world.store(WindExposure)
		const matching = exposedEntities(world).filter(
			(entity) => exposures.columns.exposure[exposures.slotOf(entity)] === 3.5,
		)
		expect(matching.length).toBe(1)
		expect(matching[0]).not.toBe(first)
	})
})

describe("wind", () => {
	test("world resources start with no wind", () => {
		const world = inputWorld(800, 600)
		expect(world.resource(WindResource)).toEqual({ x: 0, y: 0 })
	})

	test("update schedule applies wind before integration", () => {
		const world = inputWorld(800, 600)
		world.setResource(WindResource, { x: 600, y: 0 })
		world.setResource(GravityResource, { x: 0, y: 0 })
		const body = spawnRigidBody(
			world,
			createRectangleShape(20, 20),
			400,
			300,
			1,
		)
		world.add(body, WindExposure, { exposure: 1 })
		createUpdateSchedule(world).run(world, STEP)
		const velocities = world.store(Velocity)
		expect(velocities.columns.x[velocities.slotOf(body)]).toBeGreaterThan(0)
	})
})

describe("frame timer", () => {
	test("frame timer averages after warm-up", () => {
		const timer = new FrameTimer(2, 3)
		timer.record(100, 100, 100)
		timer.record(100, 100, 100)
		timer.record(1, 2, 10)
		timer.record(3, 4, 20)
		expect(timer.ready).toBe(false)
		expect(timer.summary).toBeNull()
		timer.record(5, 6, 30)
		expect(timer.ready).toBe(true)
		expect(timer.summary).toEqual({ updateMs: 3, renderMs: 4, drawCalls: 20 })
		timer.record(1000, 1000, 1000)
		expect(timer.summary).toEqual({ updateMs: 3, renderMs: 4, drawCalls: 20 })
	})
})
