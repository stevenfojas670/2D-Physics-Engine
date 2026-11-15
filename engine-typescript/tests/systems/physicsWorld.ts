import { World } from "@/ecs/World"
import type { Entity } from "@/ecs/Entity"
import { ControllerKeysResource } from "@/app/ControllerKeys"
import { installWorldResources } from "@/app/DemoScene"
import { MouseInputResource, createMouseInput } from "@/app/MouseInput"
import { createUpdateSchedule } from "@/app/schedules"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import { GravityResource } from "@/resources/Gravity"

const PHYSICS_STEP = 1 / 60
const PHYSICS_WORLD_SIZE = 2000

function installInputResources(world: World): void {
	world.setResource(ControllerKeysResource, {
		KeyW: false,
		KeyA: false,
		KeyS: false,
		KeyD: false,
		KeyQ: false,
		KeyE: false,
		Space: false,
	})
	world.setResource(MouseInputResource, createMouseInput())
}

function physicsWorld(gravityX: number, gravityY: number): World {
	const world = new World()
	installWorldResources(world, PHYSICS_WORLD_SIZE, PHYSICS_WORLD_SIZE)
	world.setResource(GravityResource, { x: gravityX, y: gravityY })
	installInputResources(world)
	return world
}

function stepWorld(
	world: World,
	steps: number,
	onStep?: (step: number) => void,
): void {
	const schedule = createUpdateSchedule(world)
	for (let step = 0; step < steps; step++) {
		schedule.run(world, PHYSICS_STEP)
		onStep?.(step)
	}
}

function positionOf(world: World, entity: Entity): [number, number] {
	const transforms = world.store(Transform)
	const slot = transforms.slotOf(entity)
	return [transforms.columns.x[slot], transforms.columns.y[slot]]
}

function velocityOf(world: World, entity: Entity): [number, number, number] {
	const velocities = world.store(Velocity)
	const slot = velocities.slotOf(entity)
	return [
		velocities.columns.x[slot],
		velocities.columns.y[slot],
		velocities.columns.angular[slot],
	]
}

export {
	PHYSICS_STEP,
	installInputResources,
	physicsWorld,
	positionOf,
	stepWorld,
	velocityOf,
}
