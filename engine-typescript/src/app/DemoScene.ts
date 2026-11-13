import type { Entity } from "@/ecs/Entity"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { MovementIntent } from "@/components/MovementIntent"
import { PlayerControlled } from "@/components/PlayerControlled"
import { Transform } from "@/components/Transform"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import { createBroadPhaseGrid } from "@/optimizations/broadPhase/createBroadPhaseGrid"
import { BroadPhaseResource } from "@/resources/BroadPhase"
import {
	CollisionSettings,
	CollisionSettingsResource,
} from "@/resources/CollisionSettings"
import { ContactLog, ContactsResource } from "@/resources/ContactLog"
import { DEFAULT_GRAVITY, GravityResource } from "@/resources/Gravity"
import { MouseDragResource, createMouseDrag } from "@/resources/MouseDrag"
import { WorldSizeResource } from "@/resources/WorldSize"
import { transformCollider } from "@/shapes/colliderGeometry"
import {
	colliderValues,
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"
import type { ColliderShape } from "@/shapes/colliderShapes"

type Walls = [Entity, Entity, Entity, Entity]

interface DemoHandles {
	walls: Walls
	player: Entity
}

interface WallPlacement {
	x: number
	y: number
	shape: ColliderShape
}

type DemoObjectKind = "Rectangle" | "Circle"

const BOUNDARY_THICKNESS = 50
const GRID_KIND = "hash"
const GRID_CELL_SIZE = 20
const DEMO_OBJECT_MASS = 10

function installWorldResources(
	world: World,
	width: number,
	height: number,
): void {
	const grid = createBroadPhaseGrid(GRID_KIND, GRID_CELL_SIZE)
	grid.resize(width, height)
	world.setResource(WorldSizeResource, { width, height })
	world.setResource(GravityResource, {
		x: DEFAULT_GRAVITY.x,
		y: DEFAULT_GRAVITY.y,
	})
	world.setResource(CollisionSettingsResource, new CollisionSettings())
	world.setResource(BroadPhaseResource, grid)
	world.setResource(ContactsResource, new ContactLog())
	world.setResource(MouseDragResource, createMouseDrag())
}

function wallPlacements(width: number, height: number): WallPlacement[] {
	const halfThickness = BOUNDARY_THICKNESS / 2
	const horizontal = createRectangleShape(width, BOUNDARY_THICKNESS)
	const vertical = createRectangleShape(BOUNDARY_THICKNESS, height)
	return [
		{ x: width / 2, y: -halfThickness, shape: horizontal },
		{ x: width / 2, y: height + halfThickness, shape: horizontal },
		{ x: -halfThickness, y: height / 2, shape: vertical },
		{ x: width + halfThickness, y: height / 2, shape: vertical },
	]
}

function spawnWalls(world: World, width: number, height: number): Walls {
	const [top, bottom, left, right] = wallPlacements(width, height).map(
		(placement) =>
			spawnStaticBody(world, placement.shape, placement.x, placement.y),
	)
	return [top, bottom, left, right]
}

function buildDemoScene(
	world: World,
	width: number,
	height: number,
): DemoHandles {
	installWorldResources(world, width, height)
	const walls = spawnWalls(world, width, height)

	const player = spawnRigidBody(
		world,
		createRectangleShape(40, 40),
		300,
		420,
		1,
		{
			group: CollisionGroups.GROUP1,
		},
	)
	world.add(player, PlayerControlled)
	world.add(player, MovementIntent)

	spawnStaticBody(world, createRectangleShape(100, 400), 300, 300)
	spawnStaticBody(world, createRectangleShape(50, 100), 200, 200)

	const settings = world.resource(CollisionSettingsResource)
	settings.setGroupName(CollisionGroups.GROUP1, "Kinematic Objects")
	settings.setGroupName(CollisionGroups.GROUP2, "Static Objects")
	settings.disableCollision(CollisionGroups.GROUP1, CollisionGroups.GROUP2)

	return { walls, player }
}

function resizeDemoWorld(
	world: World,
	handles: DemoHandles,
	width: number,
	height: number,
): void {
	const colliders = world.store(Collider)
	const placements = wallPlacements(width, height)
	for (let index = 0; index < handles.walls.length; index++) {
		const wall = handles.walls[index]
		const placement = placements[index]
		world.add(wall, Transform, { x: placement.x, y: placement.y, angle: 0 })
		const colliderSlot = world.add(
			wall,
			Collider,
			colliderValues(placement.shape),
		)
		transformCollider(
			colliders.columns,
			colliderSlot,
			placement.x,
			placement.y,
			0,
			true,
		)
	}
	world.setResource(WorldSizeResource, { width, height })
	world.resource(BroadPhaseResource).resize(width, height)
}

function spawnDemoObject(
	world: World,
	kind: DemoObjectKind,
	x: number,
	y: number,
): Entity {
	const shape =
		kind === "Rectangle" ? createRectangleShape(100, 50) : createCircleShape(50)
	return spawnRigidBody(world, shape, x, y, DEMO_OBJECT_MASS)
}

function buildStressTestPyramid(
	world: World,
	boxSize: number,
	iterations: number,
): void {
	const worldHeight = world.resource(WorldSizeResource).height
	const topOffset = worldHeight - iterations * boxSize
	for (let row = 0; row < iterations; row++) {
		for (let column = iterations; column >= iterations - row; column--) {
			const x = boxSize * row + column * (boxSize / 2)
			const y = boxSize * column
			spawnRigidBody(world, createCircleShape(boxSize / 2), x, y + topOffset, 1)
		}
	}
}

export type { DemoHandles, DemoObjectKind }
export {
	installWorldResources,
	buildDemoScene,
	resizeDemoWorld,
	spawnDemoObject,
	buildStressTestPyramid,
	spawnWalls,
}
