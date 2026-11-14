import type { Entity } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Transform } from "@/components/Transform"
import { WindExposure } from "@/components/WindExposure"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { WindResource } from "@/resources/Wind"
import type { Wind } from "@/resources/Wind"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"
import { installWorldResources } from "./DemoScene"

const SANDBOX_WIDTH = 1200
const SANDBOX_HEIGHT = 700
const SANDBOX_BODY_COUNT = 12
const SANDBOX_RESPAWN_MARGIN = 100
const SANDBOX_WIND: Readonly<Wind> = { x: 400, y: 0 }

const BOUNDARY_THICKNESS = 50
const BODY_MASS = 1
const BODY_SIZE = 40
const BODY_COLUMNS = 4
const BODY_SPACING = 120
const FIRST_BODY_X = 120
const FIRST_BODY_Y = 200
const EXPOSURES = [0.5, 1, 1.5, 2]
const RESPAWN_X = 60
const RESPAWN_FIRST_Y = 100
const RESPAWN_ROWS = 5
const RESPAWN_ROW_SPACING = 60

function spawnSandboxBody(
	world: World,
	index: number,
	x: number,
	y: number,
	exposure: number,
): Entity {
	const shape =
		index % 2 === 0
			? createCircleShape(BODY_SIZE / 2)
			: createRectangleShape(BODY_SIZE, BODY_SIZE)
	const body = spawnRigidBody(world, shape, x, y, BODY_MASS)
	world.add(body, WindExposure, { exposure })
	return body
}

function spawnFloorAndCeiling(world: World): void {
	const halfThickness = BOUNDARY_THICKNESS / 2
	const boundary = createRectangleShape(SANDBOX_WIDTH, BOUNDARY_THICKNESS)
	spawnStaticBody(world, boundary, SANDBOX_WIDTH / 2, -halfThickness)
	spawnStaticBody(
		world,
		boundary,
		SANDBOX_WIDTH / 2,
		SANDBOX_HEIGHT + halfThickness,
	)
}

function buildSandboxScene(world: World): void {
	installWorldResources(world, SANDBOX_WIDTH, SANDBOX_HEIGHT)
	world.setResource(WindResource, { x: SANDBOX_WIND.x, y: SANDBOX_WIND.y })
	spawnFloorAndCeiling(world)
	for (let index = 0; index < SANDBOX_BODY_COUNT; index++) {
		const column = index % BODY_COLUMNS
		const row = Math.floor(index / BODY_COLUMNS)
		spawnSandboxBody(
			world,
			index,
			FIRST_BODY_X + column * BODY_SPACING,
			FIRST_BODY_Y + row * BODY_SPACING,
			EXPOSURES[index % EXPOSURES.length],
		)
	}
}

function createSandboxRespawnSystem(world: World): System {
	const transforms = world.store(Transform).columns
	const exposures = world.store(WindExposure).columns
	const exposedBodies = world.view([Transform, WindExposure])
	let respawnCount = 0

	const replaceIfOutside = (
		transformSlot: number,
		exposureSlot: number,
		entity: Entity,
	): void => {
		const x = transforms.x[transformSlot]
		const isOutside =
			x < -SANDBOX_RESPAWN_MARGIN || x > SANDBOX_WIDTH + SANDBOX_RESPAWN_MARGIN
		if (!isOutside) {
			return
		}
		const exposure = exposures.exposure[exposureSlot]
		const index = respawnCount
		const y = RESPAWN_FIRST_Y + (index % RESPAWN_ROWS) * RESPAWN_ROW_SPACING
		respawnCount++
		world.defer((deferredWorld) => {
			deferredWorld.destroyEntity(entity)
			spawnSandboxBody(deferredWorld, index, RESPAWN_X, y, exposure)
		})
	}

	return () => {
		exposedBodies.each(replaceIfOutside)
	}
}

export {
	SANDBOX_WIDTH,
	SANDBOX_HEIGHT,
	SANDBOX_BODY_COUNT,
	SANDBOX_RESPAWN_MARGIN,
	SANDBOX_WIND,
	buildSandboxScene,
	createSandboxRespawnSystem,
}
